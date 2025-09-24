import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuestionSchema, insertExamSchema, insertHomeworkAssignmentSchema, insertGradeSettingsSchema, submissions } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import { eq, and, desc, max } from "drizzle-orm";
import * as path from "path";
import * as fs from "fs";
import * as bcrypt from "bcrypt";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { regradeAllZeroScoreSubmissions, regradeSubmission, gradeHomeworkSubmission } from "./regradeExams";
import { ObjectPermission } from "./objectAcl";
import { 
  createExamPermutations, 
  applyPermutationToQuestion,
  applyPermutationWithCorrectAnswers,
  SeededRandom, 
  generateShuffleSeed,
  mapPresentedToCanonical,
  mapSinglePresentedToCanonical,
  normalizeAnswerToIndices,
  letterToIndex,
  indexToLetter
} from './utils/shuffling';

// Helper function to check if user has instructor privileges (instructor or admin)
function hasInstructorPrivileges(user: any): boolean {
  return user?.role === 'instructor' || user?.role === 'admin';
}

// Configure multer for Excel file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// Helper function to update highest score for student-exam combination
async function updateHighestScore(examId: number, studentId: string, submissionId: number, currentScore: number) {
  try {
    // Get all graded submissions for this student-exam combination
    const allSubmissions = await storage.getSubmissions(examId, studentId);
    const gradedSubmissions = allSubmissions.filter(sub => sub.status === 'graded' && sub.totalScore);

    // Reset all isHighestScore flags for this student-exam combination
    for (const submission of allSubmissions) {
      await storage.updateSubmission(submission.id, { isHighestScore: false });
    }

    // Find the submission with the highest score
    if (gradedSubmissions.length > 0) {
      const highestScoreSubmission = gradedSubmissions.reduce((highest: any, current: any) => {
        const currentTotalScore = parseFloat(current.totalScore || '0');
        const highestTotalScore = parseFloat(highest.totalScore || '0');
        return currentTotalScore > highestTotalScore ? current : highest;
      });

      // Mark the highest scoring submission
      await storage.updateSubmission(highestScoreSubmission.id, { isHighestScore: true });
    }
  } catch (error) {
    console.error("Error updating highest score:", error);
  }
}

// Helper function to validate and transform Excel row
async function validateAndTransformRow(row: any, rowNumber: number) {
  const required = ['title', 'questionText', 'questionType', 'subject'];
  
  // Check required fields
  for (const field of required) {
    if (!row[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate question type
  const validTypes = ['multiple_choice', 'short_answer', 'essay', 'fill_blank', 'matching', 'ranking', 'drag_drop'];
  if (!validTypes.includes(row.questionType)) {
    throw new Error(`Invalid question type: ${row.questionType}`);
  }

  // Parse options and answers based on question type
  let options = null;
  let correctAnswer = null;
  
  if (row.questionType === 'multiple_choice') {
    if (!row.options) {
      throw new Error('Multiple choice questions must have options');
    }
    
    // Parse options (assuming they're separated by semicolons)
    options = row.options.split(';').map((opt: string) => opt.trim()).filter(Boolean);
    
    if (options.length < 2) {
      throw new Error('Multiple choice questions must have at least 2 options');
    }
    
    correctAnswer = row.correctAnswer || 'A';
  } else if (row.questionType === 'matching') {
    if (!row.options) {
      throw new Error('Matching questions must have options');
    }
    
    // Parse options for matching: "Left1;Left2|Right1;Right2"
    const parts = row.options.split('|');
    if (parts.length !== 2) {
      throw new Error('Matching options must be in format: "Left1;Left2|Right1;Right2"');
    }
    
    const leftItems = parts[0].split(';').map((opt: string) => opt.trim()).filter(Boolean);
    const rightItems = parts[1].split(';').map((opt: string) => opt.trim()).filter(Boolean);
    
    options = { leftItems, rightItems };
    
    // Parse correct answer as JSON
    try {
      correctAnswer = row.correctAnswer ? JSON.parse(row.correctAnswer) : null;
    } catch (e) {
      throw new Error('Matching correct answer must be valid JSON');
    }
  } else if (row.questionType === 'ranking') {
    if (!row.options) {
      throw new Error('Ranking questions must have options');
    }
    
    // Parse options for ranking: "Item1;Item2;Item3"
    options = row.options.split(';').map((opt: string) => opt.trim()).filter(Boolean);
    
    if (options.length < 2) {
      throw new Error('Ranking questions must have at least 2 items');
    }
    
    // Parse correct answer as JSON array
    try {
      correctAnswer = row.correctAnswer ? JSON.parse(row.correctAnswer) : null;
    } catch (e) {
      throw new Error('Ranking correct answer must be valid JSON array');
    }
  } else if (row.questionType === 'drag_drop') {
    if (!row.options) {
      throw new Error('Drag and drop questions must have options');
    }
    
    // Parse options for drag drop: "Category1;Category2|Item1;Item2"
    const parts = row.options.split('|');
    if (parts.length !== 2) {
      throw new Error('Drag drop options must be in format: "Category1;Category2|Item1;Item2"');
    }
    
    const categories = parts[0].split(';').map((opt: string) => opt.trim()).filter(Boolean);
    const items = parts[1].split(';').map((opt: string) => opt.trim()).filter(Boolean);
    
    options = { categories, items };
    
    // Parse correct answer as JSON
    try {
      correctAnswer = row.correctAnswer ? JSON.parse(row.correctAnswer) : null;
    } catch (e) {
      throw new Error('Drag drop correct answer must be valid JSON');
    }
  } else if (row.questionType === 'fill_blank') {
    // For fill in blank, correctAnswer can be pipe-separated for multiple blanks
    correctAnswer = row.correctAnswer || '';
  } else {
    // For short_answer and essay, no special processing needed
    correctAnswer = row.correctAnswer || '';
  }

  // Look up subject ID from subject name
  const subjects = await storage.getSubjects();
  const subject = subjects.find(s => s.name.toLowerCase() === row.subject.toLowerCase());
  if (!subject) {
    throw new Error(`Subject not found: ${row.subject}`);
  }

  return {
    title: row.title,
    questionText: row.questionText,
    questionType: row.questionType,
    category: row.category || 'exam', // Support category field
    subjectId: subject.id,
    difficulty: row.difficulty || 'medium',
    bloomsTaxonomy: row.bloomsTaxonomy || null,
    points: parseInt(row.points) || 1,
    options,
    correctAnswer,
    explanation: row.explanation || null
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Subject routes
  app.get('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const subjects = await storage.getSubjects();
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.post('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectData = req.body;
      const subject = await storage.createSubject(subjectData);
      res.status(201).json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ message: "Failed to create subject" });
    }
  });

  app.put('/api/subjects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const subjectId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = req.body;
      const subject = await storage.updateSubject(subjectId, updateData);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ message: "Failed to update subject" });
    }
  });

  app.delete('/api/subjects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const subjectId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteSubject(subjectId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // Question routes
  app.get('/api/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { subject, type, difficulty, bloomsTaxonomy, search, category, page, limit } = req.query;
      const result = await storage.getQuestions(userId, {
        subjectId: subject ? parseInt(subject as string) : undefined,
        questionType: type as string,
        difficulty: difficulty as string,
        bloomsTaxonomy: bloomsTaxonomy as string,
        search: search as string,
        category: (category as 'exam' | 'homework') || 'exam', // Default to exam if not specified
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const questionData = insertQuestionSchema.parse({
        ...req.body,
        instructorId: userId,
      });
      
      const question = await storage.createQuestion(questionData);
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid question data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.get('/api/questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestionById(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json(question);
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  app.put('/api/questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const questionId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const question = await storage.getQuestionById(questionId);
      if (!question || question.instructorId !== userId) {
        return res.status(404).json({ message: "Question not found" });
      }

      const updates = insertQuestionSchema.partial().parse(req.body);
      const updatedQuestion = await storage.updateQuestion(questionId, updates);
      
      res.json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete('/api/questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const questionId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const question = await storage.getQuestionById(questionId);
      if (!question || question.instructorId !== userId) {
        return res.status(404).json({ message: "Question not found" });
      }

      await storage.deleteQuestion(questionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Convert single-answer MCQ to multi-answer MCQ (utility endpoint for instructors)
  app.post('/api/questions/:id/convert-to-multi-answer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const questionId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const question = await storage.getQuestionById(questionId);
      if (!question || question.instructorId !== userId) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (question.questionType !== 'multiple_choice') {
        return res.status(400).json({ message: "Only multiple choice questions can be converted" });
      }

      // Convert single correctAnswer to array in correctAnswers
      const updates: any = {};
      
      if (question.correctAnswer && !question.correctAnswers) {
        // Convert single answer to multi-answer format
        updates.correctAnswers = [question.correctAnswer];
        updates.correctAnswer = null; // Clear the single answer field
        
        const updatedQuestion = await storage.updateQuestion(questionId, updates);
        
        res.json({ 
          message: "Question converted to multi-answer format", 
          question: updatedQuestion,
          converted: true 
        });
      } else if (question.correctAnswers) {
        res.json({ 
          message: "Question already supports multiple answers", 
          question: question,
          converted: false 
        });
      } else {
        res.status(400).json({ message: "Question has no correct answer set" });
      }
    } catch (error) {
      console.error("Error converting question:", error);
      res.status(500).json({ message: "Failed to convert question" });
    }
  });

  // Excel import endpoint
  app.post('/api/questions/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        imported: 0,
        errors: [],
        warnings: []
      };

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        
        try {
          // Validate and transform row data
          const questionData = await validateAndTransformRow(row, i + 2); // +2 for header row
          
          // Check for duplicate questions before creating
          const existingQuestionsResult = await storage.getQuestions(userId, {
            search: questionData.title, // Search by title first
            subjectId: questionData.subjectId,
            category: questionData.category
          });
          
          // Check if any existing question has the same title and question text
          const isDuplicate = existingQuestionsResult.questions.some((existing: any) => 
            existing.title?.toLowerCase().trim() === questionData.title?.toLowerCase().trim() &&
            existing.questionText?.toLowerCase().trim() === questionData.questionText?.toLowerCase().trim() &&
            existing.questionType === questionData.questionType &&
            existing.subjectId === questionData.subjectId &&
            existing.category === questionData.category
          );
          
          if (isDuplicate) {
            (results.warnings as any[]).push({
              row: i + 2,
              message: `Duplicate question skipped: "${questionData.title}" already exists`,
              data: row
            });
          } else {
            // Create question using existing storage interface
            const question = await storage.createQuestion({
              ...questionData,
              instructorId: userId
            });
            
            results.imported++;
          }
        } catch (error: any) {
          (results.errors as any[]).push({
            row: i + 2,
            message: error.message,
            data: row
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing questions:", error);
      res.status(500).json({ message: 'Import failed', error: (error as Error).message });
    }
  });

  // Exam routes
  app.get('/api/exams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (hasInstructorPrivileges(user)) {
        const { status, search } = req.query;
        console.log('Search params received:', { status, search, userId });
        const exams = await storage.getExams(userId, status as string, search as string);
        console.log('Exams returned:', exams.length, 'exams');
        
        // Strip passwords from all responses, even for instructors (security best practice)
        const sanitizedExams = exams.map(exam => ({
          ...exam,
          password: undefined
        }));
        
        res.json(sanitizedExams);
      } else {
        // For students, return exams they can take but strip sensitive information
        const exams = await storage.getActiveExamsForStudents();
        
        // Strip passwords and other sensitive data for students
        const sanitizedExams = exams.map(exam => ({
          ...exam,
          password: undefined, // Never expose passwords to students
        }));
        
        res.json(sanitizedExams);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  app.post('/api/exams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      let examData = insertExamSchema.parse({
        ...req.body,
        instructorId: userId,
      });
      
      // Hash password if provided
      if (examData.password && examData.requirePassword) {
        const saltRounds = 12;
        examData.password = await bcrypt.hash(examData.password, saltRounds);
      }
      
      const exam = await storage.createExam(examData);
      
      // Never return password hash in response
      const safeExam = {
        ...exam,
        password: undefined
      };
      
      res.status(201).json(safeExam);
    } catch (error) {
      console.error("Error creating exam:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid exam data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create exam" });
    }
  });

  app.get('/api/exams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const examId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const exam = await storage.getExamById(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Get exam questions
      let examQuestions = await storage.getExamQuestions(examId);
      
      // For students: Strip sensitive information and check access
      if (!hasInstructorPrivileges(user)) {
        // Check exam availability and eligibility
        const now = new Date();
        if (exam.status !== 'active') {
          return res.status(403).json({ message: "Exam is not available" });
        }
        
        if (exam.availableFrom && new Date(exam.availableFrom) > now) {
          return res.status(403).json({ message: "Exam is not yet available" });
        }
        
        if (exam.availableUntil && new Date(exam.availableUntil) < now) {
          return res.status(403).json({ message: "Exam is no longer available" });
        }
        
        // Check if exam requires password and if user has access
        if (exam.requirePassword && exam.password) {
          const accessKey = `${userId}_${examId}`;
          const hasAccess = req.session.examAccess?.[accessKey]?.granted;
          
          if (!hasAccess) {
            return res.status(403).json({ 
              message: "Password required", 
              requirePassword: true 
            });
          }
        }
        
        // Strip answer keys from questions for students
        examQuestions = examQuestions.map(eq => {
          const allowMultiple = eq.question.correctAnswers !== null && eq.question.correctAnswers !== undefined;
          console.log(`[DEBUG] Question ${eq.question.id}: correctAnswers=${JSON.stringify(eq.question.correctAnswers)}, allowMultipleAnswers=${allowMultiple}`);
          return {
            ...eq,
            question: {
              ...eq.question,
              correctAnswer: null, // Remove correct answer values
              correctAnswers: null, // Remove correct answer values
              allowMultipleAnswers: allowMultiple, // Flag for UI rendering
              options: eq.question.options, // Keep options for rendering
            } as any
          }
        });
        
        // Also strip password from exam object for students
        const sanitizedExam = {
          ...exam,
          password: undefined
        };
        
        const response = { ...sanitizedExam, questions: examQuestions };
        console.log(`[DEBUG] Sending API response for exam ${examId} (student):`);
        console.log(`[DEBUG] First question allowMultipleAnswers:`, (response.questions?.[0]?.question as any)?.allowMultipleAnswers);
        res.json(response);
      } else {
        // For instructors: Return full data but strip password hash
        const sanitizedExam = {
          ...exam,
          password: undefined
        };
        res.json({ ...sanitizedExam, questions: examQuestions });
      }
    } catch (error) {
      console.error("Error fetching exam:", error);
      res.status(500).json({ message: "Failed to fetch exam" });
    }
  });

  app.put('/api/exams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const examId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exam = await storage.getExamById(examId);
      if (!exam || exam.instructorId !== userId) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Validate exam data before parsing
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: "Invalid request data" });
      }

      // If publishing (status = 'active'), validate exam readiness
      if (req.body.status === 'active') {
        const examQuestions = await storage.getExamQuestions(examId);
        if (examQuestions.length === 0) {
          return res.status(400).json({ 
            message: "Cannot publish exam without questions. Please add at least one question." 
          });
        }
        
        if (!exam.title || exam.title.trim().length === 0) {
          return res.status(400).json({ 
            message: "Cannot publish exam without a title." 
          });
        }
        
        if (!exam.duration || exam.duration <= 0) {
          return res.status(400).json({ 
            message: "Cannot publish exam without a valid duration." 
          });
        }
      }

      let updates = insertExamSchema.partial().parse(req.body);
      
      // Hash password if it's being updated
      if (updates.password && updates.requirePassword) {
        const saltRounds = 12;
        updates.password = await bcrypt.hash(updates.password, saltRounds);
      }
      
      const updatedExam = await storage.updateExam(examId, updates);
      
      // Never return password hash in response
      const safeUpdatedExam = {
        ...updatedExam,
        password: undefined
      };
      
      res.json(safeUpdatedExam);
    } catch (error) {
      console.error("Error updating exam:", error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('connection') || error.message.includes('pool')) {
          return res.status(503).json({ 
            message: "Database connection error. Please try again in a moment." 
          });
        }
        
        if (error.message.includes('validation') || error.message.includes('parse')) {
          return res.status(400).json({ 
            message: "Invalid exam data provided." 
          });
        }
      }
      
      res.status(500).json({ 
        message: "Failed to update exam. Please try again." 
      });
    }
  });

  // Archive exam
  app.put('/api/exams/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const examId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exam = await storage.getExamById(examId);
      if (!exam || exam.instructorId !== userId) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const updatedExam = await storage.updateExam(examId, { status: 'archived' });
      res.json(updatedExam);
    } catch (error) {
      console.error("Error archiving exam:", error);
      res.status(500).json({ message: "Failed to archive exam" });
    }
  });

  // Delete exam
  app.delete('/api/exams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const examId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exam = await storage.getExamById(examId);
      if (!exam || exam.instructorId !== userId) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Check if exam has submissions
      const submissions = await storage.getSubmissions(examId);
      if (submissions.length > 0) {
        return res.status(400).json({ message: "Cannot delete exam with existing submissions. Archive it instead." });
      }

      await storage.deleteExam(examId);
      res.json({ message: "Exam deleted successfully" });
    } catch (error) {
      console.error("Error deleting exam:", error);
      res.status(500).json({ message: "Failed to delete exam" });
    }
  });

  // Password validation endpoint for exams
  app.post('/api/exams/:id/validate-password', isAuthenticated, async (req: any, res) => {
    try {
      const examId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { password } = req.body;
      
      // Rate limiting - check if user has made too many attempts recently
      const sessionKey = `exam_password_attempts_${userId}_${examId}`;
      if (!req.session.passwordAttempts) {
        req.session.passwordAttempts = {};
      }
      
      const now = Date.now();
      const attempts = req.session.passwordAttempts[sessionKey] || [];
      
      // Clean up attempts older than 15 minutes
      const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < 15 * 60 * 1000);
      
      // Allow max 5 attempts per 15 minutes
      if (recentAttempts.length >= 5) {
        return res.status(429).json({ message: "Too many password attempts. Please wait before trying again." });
      }
      
      // Get exam details
      const exam = await storage.getExamById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check exam availability and eligibility
      const currentDate = new Date();
      if (exam.status !== 'active') {
        return res.status(403).json({ message: "Exam is not available" });
      }
      
      if (exam.availableFrom && new Date(exam.availableFrom) > currentDate) {
        return res.status(403).json({ message: "Exam is not yet available" });
      }
      
      if (exam.availableUntil && new Date(exam.availableUntil) < currentDate) {
        return res.status(403).json({ message: "Exam is no longer available" });
      }
      
      // Check if exam requires password
      if (!exam.requirePassword || !exam.password) {
        return res.status(400).json({ message: "Exam does not require password" });
      }
      
      // Validate password using bcrypt for secure comparison
      const isPasswordValid = await bcrypt.compare(password, exam.password);
      if (!isPasswordValid) {
        // Record failed attempt
        recentAttempts.push(now);
        req.session.passwordAttempts[sessionKey] = recentAttempts;
        return res.status(401).json({ message: "Incorrect password" });
      }
      
      // Password is correct - grant access
      if (!req.session.examAccess) {
        req.session.examAccess = {};
      }
      req.session.examAccess[`${userId}_${examId}`] = {
        granted: true,
        timestamp: now
      };
      
      res.json({ message: "Password validated successfully", access: true });
    } catch (error) {
      console.error("Error validating exam password:", error);
      res.status(500).json({ message: "Failed to validate password" });
    }
  });

  // Exam question management
  app.get('/api/exams/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const examId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get exam details to check randomization settings
      const exam = await storage.getExamById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // For students: Check password protection and access validation
      if (!hasInstructorPrivileges(user)) {
        // Check exam availability and eligibility
        const now = new Date();
        if (exam.status !== 'active') {
          return res.status(403).json({ message: "Exam is not available" });
        }
        
        if (exam.availableFrom && new Date(exam.availableFrom) > now) {
          return res.status(403).json({ message: "Exam is not yet available" });
        }
        
        if (exam.availableUntil && new Date(exam.availableUntil) < now) {
          return res.status(403).json({ message: "Exam is no longer available" });
        }
        
        // Check if exam requires password
        if (exam.requirePassword && exam.password) {
          // Check if user has validated password for this exam
          const accessKey = `${userId}_${examId}`;
          const hasAccess = req.session.examAccess?.[accessKey]?.granted;
          
          if (!hasAccess) {
            return res.status(403).json({ 
              message: "Password required", 
              requirePassword: true 
            });
          }
        }
      }
      
      let examQuestions = await storage.getExamQuestions(examId);
      
      // For students: Handle shuffling and strip sensitive information
      if (!hasInstructorPrivileges(user)) {
        // Get or create submission to store permutation mappings
        let submission = null;
        let attemptNumber = 1;
        
        if (exam.randomizeOptions) {
          // Check for existing in-progress submission
          const mySubmissions = await storage.getSubmissions(examId, userId);
          const inProgressSubmission = mySubmissions.find(s => s.status === 'in_progress');
          
          if (inProgressSubmission) {
            submission = inProgressSubmission;
          } else {
            // Count attempts for seeding
            attemptNumber = mySubmissions.length + 1;
            
            // Create new submission for storing shuffle mappings
            const newSubmissionData = {
              examId,
              studentId: userId,
              status: 'in_progress' as const,
              totalScore: '0',
              submittedAt: new Date(),
              progressData: null,
              timeRemainingSeconds: exam.duration ? exam.duration * 60 : null,
              startedAt: new Date(),
              isHighestScore: false
            };
            
            const submissionId = await storage.createSubmission(newSubmissionData);
            submission = typeof submissionId === 'number' ? await storage.getSubmissionById(submissionId) : null;
          }
        }
        
        // Generate or retrieve permutation mappings for answer shuffling
        let permutationMappings = {};
        
        if (exam.randomizeOptions && submission) {
          try {
            const progressData = submission.progressData ? 
              (typeof submission.progressData === 'string' ? 
                JSON.parse(submission.progressData) : submission.progressData) : {};
            
            if (progressData.permutationMappings) {
              // Use existing mappings for consistency
              permutationMappings = progressData.permutationMappings;
            } else {
              // Generate new mappings
              permutationMappings = createExamPermutations(
                examQuestions.map(eq => eq.question),
                {
                  examId,
                  studentId: userId,
                  attemptNumber
                },
                exam.randomizeOptions
              );
              
              // Store mappings in submission progress data
              const updatedProgressData = {
                ...progressData,
                permutationMappings
              };
              
              await storage.updateSubmission(submission.id, {
                progressData: JSON.stringify(updatedProgressData)
              });
            }
          } catch (error) {
            console.error("Error handling permutation mappings:", error);
            // Continue without shuffling if there's an error
          }
        }
        
        // Store remapped correct answers for grading and prepare student-facing questions
        const remappedCorrectAnswers: { [questionId: number]: any } = {};
        
        examQuestions = examQuestions.map(eq => {
          const permutation = (permutationMappings as any)[eq.questionId];
          // Capture original correctAnswers before stripping for allowMultipleAnswers flag
          const originalCorrectAnswers = eq.question.correctAnswers;
          const allowMultiple = originalCorrectAnswers !== null && originalCorrectAnswers !== undefined;
          console.log(`[DEBUG] Question ${eq.question.id}: correctAnswers=${JSON.stringify(originalCorrectAnswers)}, allowMultipleAnswers=${allowMultiple}`);
          
          // Generate remapped correct answers for grading if shuffling is applied
          if (permutation && exam.randomizeOptions) {
            const remappedQuestion = applyPermutationWithCorrectAnswers(eq.question, permutation);
            remappedCorrectAnswers[eq.questionId] = {
              correctAnswer: remappedQuestion.correctAnswer,
              correctAnswers: remappedQuestion.correctAnswers,
              _shuffleDebug: remappedQuestion._shuffleDebug
            };
            console.log(`[DEBUG] Question ${eq.question.id} remapped: ${JSON.stringify(remappedQuestion.correctAnswers)} (original: ${JSON.stringify(originalCorrectAnswers)})`);
          }
          
          const baseQuestion = {
            ...eq.question,
            correctAnswer: undefined, // Remove correct answer
            correctAnswers: undefined, // Remove correct answers
            allowMultipleAnswers: allowMultiple, // Flag for UI rendering
          } as any;
          
          // Apply permutation if available
          if (permutation && exam.randomizeOptions) {
            return {
              ...eq,
              question: applyPermutationToQuestion(baseQuestion, permutation)
            };
          }
          
          return {
            ...eq,
            question: baseQuestion
          };
        });

        // Store remapped correct answers in submission progress data for grading
        if (Object.keys(remappedCorrectAnswers).length > 0 && submission) {
          try {
            const existingProgressData = submission.progressData ? 
              (typeof submission.progressData === 'string' ? 
                JSON.parse(submission.progressData) : submission.progressData) : {};
            
            const updatedProgressData = {
              ...existingProgressData,
              permutationMappings,
              remappedCorrectAnswers
            };
            
            await storage.updateSubmission(submission.id, {
              progressData: JSON.stringify(updatedProgressData)
            });
            console.log(`[DEBUG] Stored remapped correct answers for ${Object.keys(remappedCorrectAnswers).length} questions`);
          } catch (error) {
            console.error("Error storing remapped correct answers:", error);
          }
        }
      }
      
      // If randomizeQuestions is enabled, shuffle the questions for students
      if (exam.randomizeQuestions && !hasInstructorPrivileges(user)) {
        // Create a seeded random function using userId + examId for consistent randomization per student
        const seed = parseInt(userId.slice(-6), 36) + examId;
        const random = (seed: number) => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };
        
        // Fisher-Yates shuffle with seeded random
        for (let i = examQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(random(seed + i) * (i + 1));
          [examQuestions[i], examQuestions[j]] = [examQuestions[j], examQuestions[i]];
        }
      }
      
      res.json(examQuestions);
    } catch (error) {
      console.error("Error fetching exam questions:", error);
      res.status(500).json({ message: "Failed to fetch exam questions" });
    }
  });

  app.post('/api/exams/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const examId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exam = await storage.getExamById(examId);
      if (!exam || exam.instructorId !== userId) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Support both single question and multiple questions
      if (req.body.questionIds && Array.isArray(req.body.questionIds)) {
        // Multiple questions - add them with auto-generated order and default points
        for (let i = 0; i < req.body.questionIds.length; i++) {
          const questionId = req.body.questionIds[i];
          const order = i + 1; // Auto-generate order based on array position
          const points = req.body.points || 1; // Default to 1 point per question
          await storage.addQuestionToExam(examId, questionId, order, points);
        }
        res.status(201).json({ message: "Questions added to exam" });
      } else {
        // Single question - use existing logic
        const { questionId, order, points } = req.body;
        await storage.addQuestionToExam(examId, questionId, order, points);
        res.status(201).json({ message: "Question added to exam" });
      }
    } catch (error) {
      console.error("Error adding question to exam:", error);
      res.status(500).json({ message: "Failed to add question to exam" });
    }
  });

  app.delete('/api/exams/:examId/questions/:questionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const examId = parseInt(req.params.examId);
      const questionId = parseInt(req.params.questionId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exam = await storage.getExamById(examId);
      if (!exam || exam.instructorId !== userId) {
        return res.status(404).json({ message: "Exam not found" });
      }

      await storage.removeQuestionFromExam(examId, questionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing question from exam:", error);
      res.status(500).json({ message: "Failed to remove question from exam" });
    }
  });

  // Save progress endpoints
  app.post('/api/exams/:id/save-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const examId = parseInt(req.params.id);
      const { answers, currentQuestionIndex, timeRemainingSeconds } = req.body;

      // Check if exam exists
      const exam = await storage.getExamById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Find existing in-progress submission or create one
      const existingSubmissions = await storage.getSubmissions(examId, userId);
      let submission = existingSubmissions.find(sub => sub.status === 'in_progress');

      if (!submission) {
        // Create a new in-progress submission
        submission = await storage.createSubmission({
          examId,
          studentId: userId,
          status: 'in_progress',
        });
      }

      // Update the submission with progress data
      const progressData = {
        answers,
        currentQuestionIndex,
        timeRemainingSeconds,
        savedAt: new Date().toISOString(),
      };

      await storage.updateSubmission(submission.id, {
        progressData,
        lastSavedAt: new Date(),
        timeRemainingSeconds,
      });

      res.json({ message: "Progress saved successfully", submissionId: submission.id });
    } catch (error) {
      console.error("Error saving exam progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  app.get('/api/exams/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const examId = parseInt(req.params.id);

      // Find in-progress submission
      const submissions = await storage.getSubmissions(examId, userId);
      const inProgressSubmission = submissions.find(sub => sub.status === 'in_progress');

      if (!inProgressSubmission || !inProgressSubmission.progressData) {
        return res.json({ hasProgress: false });
      }

      res.json({
        hasProgress: true,
        progressData: inProgressSubmission.progressData,
        lastSavedAt: inProgressSubmission.lastSavedAt,
        timeRemainingSeconds: inProgressSubmission.timeRemainingSeconds,
      });
    } catch (error) {
      console.error("Error fetching exam progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Submission routes
  app.post('/api/exams/:id/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const examId = parseInt(req.params.id);
      const { answers, timeTaken } = req.body;

      // Get exam details to check settings
      const exam = await storage.getExamById(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Get permutation mappings and progress data from in-progress submission if available
      let permutationMappings = {};
      let progressData: any = {};
      if (exam.randomizeOptions) {
        try {
          const mySubmissions = await storage.getSubmissions(examId, userId);
          const inProgressSubmission = mySubmissions.find(s => s.status === 'in_progress');
          
          if (inProgressSubmission && inProgressSubmission.progressData) {
            progressData = typeof inProgressSubmission.progressData === 'string' 
              ? JSON.parse(inProgressSubmission.progressData) 
              : inProgressSubmission.progressData;
            
            if (progressData.permutationMappings) {
              permutationMappings = progressData.permutationMappings;
            }
          }
        } catch (error) {
          console.error("Error retrieving permutation mappings:", error);
        }
      }

      // Create submission
      const submission = await storage.createSubmission({
        examId,
        studentId: userId,
        submittedAt: new Date(),
        timeTaken,
        status: 'submitted',
      });

      // Create answers and check for subjective questions
      let totalScore = 0;
      let maxScore = 0;
      let hasSubjectiveQuestions = false;

      for (const answer of answers) {
        const question = await storage.getQuestionById(answer.questionId);
        if (!question) continue;


        let score = 0;
        maxScore += question.points;

        // Check if this is a subjective question
        if (question.questionType === 'essay' || question.questionType === 'short_answer' || question.questionType === 'fill_blank') {
          hasSubjectiveQuestions = true;
        }

        // Auto-grade multiple choice questions with multiple correct answer support
        if (question.questionType === 'multiple_choice') {
          // Use remapped correct answers if available (for shuffled questions), otherwise use original
          let correctAnswers = question.correctAnswers && Array.isArray(question.correctAnswers) 
            ? question.correctAnswers 
            : (question.correctAnswer ? [question.correctAnswer] : []);
          
          // Check for remapped correct answers if shuffling was used
          if (exam.randomizeOptions && progressData && progressData.remappedCorrectAnswers) {
            const remappedData = progressData.remappedCorrectAnswers[answer.questionId];
            if (remappedData) {
              correctAnswers = remappedData.correctAnswers && Array.isArray(remappedData.correctAnswers)
                ? remappedData.correctAnswers
                : (remappedData.correctAnswer ? [remappedData.correctAnswer] : []);
              console.log(`[DEBUG] Using remapped correct answers for question ${question.id}: ${JSON.stringify(correctAnswers)} (original: ${JSON.stringify(question.correctAnswers)})`);
            }
          }
          
          // Handle multiple student selections
          let studentAnswers: string[] = [];
          if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
            studentAnswers = answer.selectedOptions;
          } else if (answer.selectedOption) {
            studentAnswers = [answer.selectedOption];
          } else if (answer.answerText) {
            // Handle comma-separated answers as fallback
            studentAnswers = answer.answerText.split(',').map((a: string) => a.trim()).filter((a: string) => a);
          }
          
          // Map student answers from presented indices back to canonical indices if shuffling was used
          const permutation = (permutationMappings as any)[answer.questionId];
          if (permutation && exam.randomizeOptions) {
            try {
              // Convert student answers to indices if they're letters
              const studentIndices = normalizeAnswerToIndices(studentAnswers);
              // Map back to canonical indices
              const canonicalIndices = mapPresentedToCanonical(studentIndices, permutation);
              // Convert back to letters for comparison
              studentAnswers = canonicalIndices.map(idx => indexToLetter(idx));
            } catch (error) {
              console.error(`Error mapping student answers for question ${answer.questionId}:`, error);
              // Fall back to original answers if mapping fails
            }
          }
          
          if (correctAnswers.length > 1) {
            // Multiple correct answers - calculate partial credit
            console.log(`DEBUG - Multiple choice grading for question ${question.id}:`);
            console.log(`  Correct answers:`, correctAnswers);
            console.log(`  Student answers:`, studentAnswers);
            console.log(`  Raw answer data:`, { selectedOptions: answer.selectedOptions, selectedOption: answer.selectedOption, answerText: answer.answerText });
            
            const correctCount = studentAnswers.filter(ans => correctAnswers.includes(ans)).length;
            const incorrectCount = studentAnswers.filter(ans => !correctAnswers.includes(ans)).length;
            
            console.log(`  Correct count: ${correctCount}, Incorrect count: ${incorrectCount}`);
            
            // Award partial credit: (correct selections - incorrect selections) / total correct answers
            // Minimum score is 0
            const partialScore = Math.max(0, (correctCount - incorrectCount) / correctAnswers.length);
            score = Math.round(partialScore * question.points * 100) / 100;
            
            console.log(`Exam submission grading - Multiple choice question ${question.id}: ${correctCount} correct, ${incorrectCount} incorrect out of ${correctAnswers.length} total correct answers. Score: ${score}/${question.points}`);
          } else {
            // Single correct answer - traditional grading
            if (studentAnswers.length === 1 && correctAnswers.includes(studentAnswers[0])) {
              score = question.points;
            } else {
              score = 0;
            }
            console.log(`Exam submission grading - Single choice question ${question.id}: ${studentAnswers.includes(correctAnswers[0]) ? 'correct' : 'incorrect'} answer (${studentAnswers.join(',')} vs ${correctAnswers.join(',')}), score: ${score}/${question.points}`);
          }
        }

        // Auto-grade matching questions
        else if (question.questionType === 'matching') {
          try {
            let correctAnswer, studentAnswer;
            
            try {
              correctAnswer = typeof question.correctAnswer === 'string' 
                ? JSON.parse(question.correctAnswer) 
                : question.correctAnswer;
            } catch (parseError) {
              console.error('Error parsing matching question correctAnswer:', parseError, 'Value:', question.correctAnswer);
              correctAnswer = {};
            }
            
            try {
              studentAnswer = typeof answer.answerText === 'string'
                ? JSON.parse(answer.answerText || '{}')
                : answer.answerText || {};
            } catch (parseError) {
              console.error('Error parsing matching question studentAnswer:', parseError, 'Value:', answer.answerText);
              studentAnswer = {};
            }
            
            let correctMatches = 0;
            let totalMatches = 0;
            
            console.log(`Grading matching question ${question.id}:`, {
              correctAnswer: JSON.stringify(correctAnswer),
              studentAnswer: JSON.stringify(studentAnswer)
            });
            
            // Handle array of pairs format: [{left: "A", right: "B"}, ...]
            if (Array.isArray(correctAnswer)) {
              totalMatches = correctAnswer.length;
              
              // Create mapping from left items to their correct right matches
              const correctMapping: { [key: string]: string } = {};
              correctAnswer.forEach((pair: any) => {
                if (pair.left && pair.right) {
                  correctMapping[pair.left] = pair.right;
                }
              });
              
              // Check student's answers: format is {0: "selected_option", 1: "another_option", ...}
              // where index corresponds to the left item position in the array
              correctAnswer.forEach((pair: any, index: number) => {
                const studentSelection = studentAnswer[index];
                if (studentSelection && pair.right && studentSelection === pair.right) {
                  correctMatches++;
                }
              });
            }
            // Handle object with key-value pairs format: {"A": "B", ...}
            else if (typeof correctAnswer === 'object' && correctAnswer !== null) {
              const correctPairs = Object.entries(correctAnswer);
              totalMatches = correctPairs.length;
              
              correctPairs.forEach(([leftItem, rightItem], index) => {
                const studentSelection = studentAnswer[index];
                if (studentSelection && studentSelection === rightItem) {
                  correctMatches++;
                }
              });
            }
            
            // Partial credit for matching
            score = totalMatches > 0 ? (correctMatches / totalMatches) * question.points : 0;
            console.log(`Matching grading: ${correctMatches}/${totalMatches} correct, score: ${score}/${question.points}`);
          } catch (error) {
            console.error('Error grading matching question:', error);
            // Default to 0 if grading fails
            score = 0;
          }
        }
        // Auto-grade drag-and-drop questions
        else if (question.questionType === 'drag_drop') {
          try {
            const correctAnswer = typeof question.correctAnswer === 'string' 
              ? JSON.parse(question.correctAnswer) 
              : question.correctAnswer;
            const rawStudentAnswer = answer.selectedOption || answer.answerText;
            const studentAnswer = typeof rawStudentAnswer === 'string'
              ? JSON.parse(rawStudentAnswer || '{}')
              : rawStudentAnswer || {};
            
            let correctPlacements = 0;
            let totalItems = 0;
            
            console.log(`Grading drag-drop question ${question.id}:`, {
              correctAnswer: JSON.stringify(correctAnswer),
              studentAnswer: JSON.stringify(studentAnswer)
            });
            
            // Build mapping from item to correct zone index AND zone name mapping
            const itemToZoneMapping: { [item: string]: number } = {};
            const zoneIndexToName: { [index: number]: string } = {};
            
            if (correctAnswer && correctAnswer.zones && Array.isArray(correctAnswer.zones)) {
              // Handle zones array format: { zones: [{ zone: "Nord", items: ["Cap-Haitien"] }] }
              correctAnswer.zones.forEach((zone: any, zoneIndex: number) => {
                // Store zone name mapping
                const zoneName = zone.zone || zone.name || `Zone ${zoneIndex}`;
                zoneIndexToName[zoneIndex] = zoneName;
                
                if (zone && Array.isArray(zone.items)) {
                  zone.items.forEach((item: string) => {
                    if (item && String(item).trim()) {
                      itemToZoneMapping[String(item)] = zoneIndex;
                      totalItems++;
                    }
                  });
                }
              });
            } else if (correctAnswer && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)) {
              // Handle key-value format: { "Nord": "Cap-Haïtien", "Sud": "Les Cayes", ... }
              const entries = Object.entries(correctAnswer);
              entries.forEach(([zoneName, item], index) => {
                if (typeof item === 'string' && item.trim()) {
                  itemToZoneMapping[String(item)] = index;
                  zoneIndexToName[index] = zoneName;
                  totalItems++;
                }
              });
            }
            
            console.log(`Built item-to-zone mapping:`, itemToZoneMapping);
            console.log(`Zone index to name mapping:`, zoneIndexToName);
            console.log(`Total items to match: ${totalItems}`);
            
            // Check student's placements against correct mapping
            if (studentAnswer && typeof studentAnswer === 'object') {
              // Handle multiple student answer formats
              if (Array.isArray(studentAnswer)) {
                // Handle array format
                studentAnswer.forEach((placement: any, zoneIndex: number) => {
                  if (placement && Array.isArray(placement.items)) {
                    placement.items.forEach((item: string) => {
                      if (item && itemToZoneMapping[String(item)] === zoneIndex) {
                        correctPlacements++;
                        console.log(`Correct placement: "${item}" in zone ${zoneIndex} (${zoneIndexToName[zoneIndex] || 'Unknown'})`);
                      } else {
                        console.log(`Incorrect placement: "${item}" in zone ${zoneIndex}, should be in zone ${itemToZoneMapping[String(item)]} (${zoneIndexToName[itemToZoneMapping[String(item)]] || 'Unknown'})`);
                      }
                    });
                  }
                });
              } else {
                // Handle indexed object format: {"0":["item1"], "1":["item2"], ...}
                Object.entries(studentAnswer).forEach(([zoneIndex, items]) => {
                  const zoneNum = parseInt(zoneIndex);
                  if (Array.isArray(items)) {
                    items.forEach((item: string) => {
                      if (item && String(item).trim() && itemToZoneMapping[String(item)] === zoneNum) {
                        correctPlacements++;
                        console.log(`Correct placement: "${item}" in zone ${zoneNum} (${zoneIndexToName[zoneNum] || 'Unknown'})`);
                      } else {
                        console.log(`Incorrect placement: "${item}" in zone ${zoneNum}, should be in zone ${itemToZoneMapping[String(item)]} (${zoneIndexToName[itemToZoneMapping[String(item)]] || 'Unknown'})`);
                      }
                    });
                  } else if (typeof items === 'string' && items.trim() && itemToZoneMapping[String(items)] === zoneNum) {
                    correctPlacements++;
                    console.log(`Correct placement: "${items}" in zone ${zoneNum} (${zoneIndexToName[zoneNum] || 'Unknown'})`);
                  }
                });
              }
            }
            
            console.log(`=== FINAL DRAG-DROP RESULT ===`);
            console.log(`Question ${question.id}: ${correctPlacements}/${totalItems} correct, score: ${(correctPlacements / totalItems) * question.points}/${question.points}`);
            console.log(`=== END DRAG-DROP RESULT ===`);
            
            // Partial credit for drag-and-drop
            score = totalItems > 0 ? (correctPlacements / totalItems) * question.points : 0;
          } catch (error) {
            console.error('Error grading drag-drop question:', error);
            // Default to 0 if grading fails
            score = 0;
          }
        }
        // Auto-grade ranking questions
        else if (question.questionType === 'ranking') {
          try {
            let correctOrder, studentOrder;
            
            // Handle multiple formats for correct answer
            if (Array.isArray(question.correctAnswer)) {
              correctOrder = question.correctAnswer;
            } else if (typeof question.correctAnswer === 'string') {
              const rawCorrectAnswer = question.correctAnswer;
              
              // Check for malformed JSON format like {"item1","item2",...}
              if (rawCorrectAnswer.startsWith('{') && rawCorrectAnswer.includes('",') && !rawCorrectAnswer.includes(':')) {
                console.log('Detected malformed ranking JSON, converting to array format');
                // Convert {"item1","item2","item3"} to ["item1","item2","item3"]
                const cleanedAnswer = rawCorrectAnswer
                  .replace(/^\{/, '[')  // Replace opening brace with bracket
                  .replace(/\}$/, ']')  // Replace closing brace with bracket
                  .replace(/(?<!")([^",\[\]]+)(?!")/g, '"$1"'); // Quote unquoted strings
                
                try {
                  correctOrder = JSON.parse(cleanedAnswer);
                  console.log('Successfully converted malformed JSON:', {
                    original: rawCorrectAnswer,
                    converted: cleanedAnswer,
                    parsed: correctOrder
                  });
                } catch (conversionError) {
                  console.error('Failed to convert malformed ranking JSON:', conversionError);
                  correctOrder = [];
                }
              } else {
                // Regular JSON parsing
                correctOrder = JSON.parse(rawCorrectAnswer || '[]');
              }
            } else {
              correctOrder = [];
            }
            
            // Parse student answer
            studentOrder = Array.isArray(answer.answerText)
              ? answer.answerText
              : JSON.parse(answer.answerText || '[]');
            
            console.log(`Grading ranking question ${question.id}:`, {
              correctOrder,
              studentOrder,
              rawCorrectAnswer: `${question.correctAnswer}`
            });
            
            let correctPositions = 0;
            const totalItems = correctOrder.length;
            
            for (let i = 0; i < totalItems; i++) {
              if (studentOrder[i] === correctOrder[i]) {
                correctPositions++;
                console.log(`Position ${i}: "${studentOrder[i]}" is correct`);
              } else {
                console.log(`Position ${i}: "${studentOrder[i]}" should be "${correctOrder[i]}"`);
              }
            }
            
            // Partial credit for ranking
            score = totalItems > 0 ? (correctPositions / totalItems) * question.points : 0;
            console.log(`Ranking question ${question.id}: ${correctPositions}/${totalItems} correct, score: ${score}/${question.points}`);
          } catch (error) {
            console.error('Error grading ranking question:', error);
            console.log('Invalid JSON in ranking question:', { correctAnswer: question.correctAnswer, studentAnswer: answer.answerText });
            score = 0;
          }
        }

        totalScore += score;

        const createdAnswer = await storage.createAnswer({
          submissionId: submission.id,
          questionId: answer.questionId,
          answerText: answer.answerText,
          selectedOption: answer.selectedOption,
          selectedOptions: answer.selectedOptions || null, // Store multiple selected options for MCQ
          attachmentUrl: answer.attachmentUrl || null,
          linkUrl: answer.linkUrl || null,
          score: score.toString(),
          maxScore: question.points.toString(),
        });


        // Set ACL policy on uploaded files
        if (answer.attachmentUrl) {
          try {
            const objectStorageService = new ObjectStorageService();
            await objectStorageService.trySetObjectEntityAclPolicy(
              answer.attachmentUrl,
              {
                owner: userId,
                visibility: "private",
              }
            );
          } catch (error) {
            console.error("Error setting ACL policy on uploaded file:", error);
            // Don't fail the entire submission if ACL setting fails
          }
        }
      }

      // Determine final status based on question types
      let finalStatus: 'graded' | 'pending' = 'graded';
      
      // Log grading summary
      console.log(`Exam submission grading summary:`, {
        examId,
        studentId: userId,
        totalScore,
        maxScore,
        hasSubjectiveQuestions,
        answersProcessed: answers.length
      });
      
      // If there are subjective questions, always mark as pending for manual grading
      if (hasSubjectiveQuestions) {
        finalStatus = 'pending';
      }

      // Update submission with scores and final status
      const updatedSubmission = await storage.updateSubmission(submission.id, {
        totalScore: totalScore.toString(),
        maxScore: maxScore.toString(),
        status: finalStatus,
      });

      // Check and update highest score for this student-exam combination
      await updateHighestScore(examId, userId, submission.id, totalScore);

      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error submitting exam:", error);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  // Grading routes
  app.get('/api/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { examId, studentId, status } = req.query;
      
      if (hasInstructorPrivileges(user)) {
        let submissions = await storage.getSubmissionsWithDetails(
          examId ? parseInt(examId as string) : undefined,
          studentId as string
        );
        
        // Filter by status if provided
        if (status) {
          submissions = submissions.filter(sub => sub.status === status);
        }
        
        res.json(submissions);
      } else {
        // Students can only see their own submissions
        const submissions = await storage.getSubmissions(undefined, userId);
        
        // Hide scores for pending submissions and mark highest scores
        const filteredSubmissions = submissions.map(submission => {
          if (submission.status === 'pending') {
            return {
              ...submission,
              totalScore: null,
              maxScore: null,
              isHighestScore: false
            };
          }
          return {
            ...submission,
            isHighestScore: submission.isHighestScore || false
          };
        });
        
        res.json(filteredSubmissions);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get submission details for manual grading
  app.get('/api/submissions/:id/grade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const submissionId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const answers = await storage.getAnswers(submissionId);
      const exam = await storage.getExamById(submission.examId);
      const student = await storage.getUser(submission.studentId);
      
      // Get question details for each answer
      const answersWithQuestions = await Promise.all(
        answers.map(async (answer) => {
          const question = await storage.getQuestionById(answer.questionId);
          return { ...answer, question };
        })
      );

      res.json({
        submission,
        exam,
        student,
        answers: answersWithQuestions
      });
    } catch (error) {
      console.error("Error fetching submission for grading:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  app.put('/api/answers/:id/grade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const answerId = parseInt(req.params.id);
      const { score, feedback } = req.body;
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate score is a number
      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ message: "Invalid score" });
      }

      const updatedAnswer = await storage.updateAnswer(answerId, {
        score: score.toString(),
        feedback: feedback || '',
        gradedAt: new Date(),
        gradedBy: userId
      });

      res.json(updatedAnswer);
    } catch (error) {
      console.error("Error grading answer:", error);
      res.status(500).json({ message: "Failed to grade answer" });
    }
  });

  // Get homework submission details for grading
  app.get('/api/homework-submissions/:id/grade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const submissionId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submission = await storage.getHomeworkSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Homework submission not found" });
      }

      const answers = await storage.getHomeworkAnswers(submissionId);
      const homework = await storage.getHomeworkAssignmentById(submission.homeworkId);
      const student = await storage.getUser(submission.studentId);
      
      // Get question details for each answer
      const answersWithQuestions = await Promise.all(
        answers.map(async (answer) => {
          const question = await storage.getQuestionById(answer.questionId);
          return { ...answer, question };
        })
      );

      res.json({
        submission,
        homework,
        student,
        answers: answersWithQuestions
      });
    } catch (error) {
      console.error("Error fetching homework submission for grading:", error);
      res.status(500).json({ message: "Failed to fetch homework submission" });
    }
  });

  // Grade individual homework answer
  app.put('/api/homework-answers/:id/grade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const answerId = parseInt(req.params.id);
      const { score, feedback } = req.body;
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate score is a number
      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ message: "Invalid score" });
      }

      const updatedAnswer = await storage.updateHomeworkAnswer(answerId, {
        score: score.toString(),
        feedback: feedback || '',
        gradedAt: new Date(),
        gradedBy: userId
      });

      res.json(updatedAnswer);
    } catch (error) {
      console.error("Error grading homework answer:", error);
      res.status(500).json({ message: "Failed to grade homework answer" });
    }
  });

  // Finalize homework submission grading
  app.put('/api/homework-submissions/:id/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const submissionId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submission = await storage.getHomeworkSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Homework submission not found" });
      }

      // Calculate total score from all answers
      const answers = await storage.getHomeworkAnswers(submissionId);
      const totalScore = answers.reduce((sum, answer) => sum + parseFloat(answer.score || '0'), 0);
      const maxScore = answers.reduce((sum, answer) => sum + parseFloat(answer.maxScore || '0'), 0);

      const updatedSubmission = await storage.updateHomeworkSubmission(submissionId, {
        totalScore: totalScore.toString(),
        maxScore: maxScore.toString(),
        status: 'graded'
      });

      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error finalizing homework submission:", error);
      res.status(500).json({ message: "Failed to finalize homework submission" });
    }
  });

  // Finalize submission grading
  app.put('/api/submissions/:id/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const submissionId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Calculate total score from all answers
      const answers = await storage.getAnswers(submissionId);
      const totalScore = answers.reduce((sum, answer) => sum + parseFloat(answer.score || '0'), 0);
      const maxScore = answers.reduce((sum, answer) => sum + parseFloat(answer.maxScore || '0'), 0);

      const updatedSubmission = await storage.updateSubmission(submissionId, {
        totalScore: totalScore.toString(),
        maxScore: maxScore.toString(),
        status: 'graded'
      });

      // Check and update highest score for this student-exam combination
      await updateHighestScore(submission.examId, submission.studentId, submissionId, totalScore);

      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error finalizing submission:", error);
      res.status(500).json({ message: "Failed to finalize submission" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/instructor-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getInstructorStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching instructor stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/analytics/exam/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const examId = parseInt(req.params.id);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exam = await storage.getExamById(examId);
      if (!exam || exam.instructorId !== userId) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const analytics = await storage.getExamAnalytics(examId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching exam analytics:", error);
      res.status(500).json({ message: "Failed to fetch exam analytics" });
    }
  });

  // Role management routes (for testing purposes)
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // For testing - allow any user to view all users for role assignment
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const targetUserId = req.params.id;
      const { role } = req.body;
      
      console.log(`Role update request: User ${userId} updating ${targetUserId} to role ${role}`);
      
      if (!role || !['instructor', 'student'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // For testing - allow any user to update roles
      const updatedUser = await storage.updateUserRole(targetUserId, role);
      console.log(`Role updated successfully: ${JSON.stringify(updatedUser)}`);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Object storage routes for file uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/answers/:id/attachment", isAuthenticated, async (req: any, res) => {
    if (!req.body.attachmentURL) {
      return res.status(400).json({ error: "attachmentURL is required" });
    }

    const userId = req.user.claims.sub;
    const answerId = parseInt(req.params.id);

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.attachmentURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      // Update the answer with the attachment URL
      await storage.updateAnswerAttachment(answerId, objectPath, req.body.linkUrl || null);

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting attachment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Handle question attachment uploads and set ACL policies
  // Normalize object storage path
  app.post("/api/objects/normalize-path", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.body.path) {
        return res.status(400).json({ error: "path is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.path);
      
      res.json({ normalizedPath });
    } catch (error) {
      console.error("Error normalizing path:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/questions/:id/attachment", isAuthenticated, async (req: any, res) => {
    if (!req.body.attachmentURL) {
      return res.status(400).json({ error: "attachmentURL is required" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    const questionId = parseInt(req.params.id);

    if (!hasInstructorPrivileges(user)) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const question = await storage.getQuestionById(questionId);
      if (!question || question.instructorId !== userId) {
        return res.status(404).json({ error: "Question not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.attachmentURL,
        {
          owner: userId,
          visibility: "public", // Question attachments should be publicly accessible to students
        },
      );

      // Update the question with the attachment URL
      await storage.updateQuestion(questionId, { attachmentUrl: objectPath });

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting question attachment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Homework routes
  app.get('/api/homework', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (hasInstructorPrivileges(user)) {
        const { status, search, page, limit } = req.query;
        const pageNum = page ? parseInt(page as string) : undefined;
        const limitNum = limit ? parseInt(limit as string) : undefined;
        
        const homework = await storage.getHomework(userId, {
          status: status as string,
          search: search as string,
          page: pageNum,
          limit: limitNum
        });
        res.json(homework);
      } else {
        // For students, return active homework they can access
        const homework = await storage.getActiveHomeworkForStudents();
        res.json(homework);
      }
    } catch (error) {
      console.error("Error fetching homework:", error);
      res.status(500).json({ message: "Failed to fetch homework" });
    }
  });

  app.post('/api/homework', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const homeworkData = insertHomeworkAssignmentSchema.parse({
        ...req.body,
        instructorId: userId,
      });
      
      const homework = await storage.createHomework(homeworkData);
      res.status(201).json(homework);
    } catch (error) {
      console.error("Error creating homework:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid homework data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create homework" });
    }
  });

  app.put('/api/homework/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const homeworkId = parseInt(req.params.id);
      if (isNaN(homeworkId)) {
        return res.status(400).json({ message: "Invalid homework ID" });
      }

      const homework = await storage.updateHomework(homeworkId, req.body);
      res.json(homework);
    } catch (error) {
      console.error("Error updating homework:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid homework data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update homework" });
    }
  });

  // Homework Questions API - separate from exam questions
  app.get('/api/homework-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { subject, type, difficulty, bloomsTaxonomy, search } = req.query;
      const questionsResult = await storage.getQuestions(userId, {
        subjectId: subject ? parseInt(subject as string) : undefined,
        questionType: type as string,
        difficulty: difficulty as string,
        bloomsTaxonomy: bloomsTaxonomy as string,
        search: search as string,
        category: 'homework', // Only show homework questions
      });
      
      res.json(questionsResult);
    } catch (error) {
      console.error("Error fetching homework questions:", error);
      res.status(500).json({ message: "Failed to fetch homework questions" });
    }
  });

  // Add question to homework assignment
  app.post('/api/homework/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const homeworkId = parseInt(req.params.id);
      if (isNaN(homeworkId)) {
        return res.status(400).json({ message: "Invalid homework ID" });
      }

      const { questionId, order, points } = req.body;
      
      if (!questionId || !order || !points) {
        return res.status(400).json({ message: "Missing required fields: questionId, order, points" });
      }

      const result = await storage.addQuestionToHomework(homeworkId, questionId, order, points);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error adding question to homework:", error);
      res.status(500).json({ message: "Failed to add question to homework" });
    }
  });

  // Get specific homework assignment details
  app.get('/api/homework/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const homeworkId = parseInt(req.params.id);

      if (isNaN(homeworkId)) {
        return res.status(400).json({ message: "Invalid homework ID" });
      }

      const homework = await storage.getHomeworkById(homeworkId);
      if (!homework) {
        return res.status(404).json({ message: "Homework not found" });
      }

      // Students can only access active homework
      if (!hasInstructorPrivileges(user) && homework.status !== 'active') {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(homework);
    } catch (error) {
      console.error("Error fetching homework:", error);
      res.status(500).json({ message: "Failed to fetch homework" });
    }
  });

  // Get homework questions for taking
  app.get('/api/homework/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const homeworkId = parseInt(req.params.id);

      if (isNaN(homeworkId)) {
        return res.status(400).json({ message: "Invalid homework ID" });
      }

      // Verify homework exists and is accessible
      const homework = await storage.getHomeworkById(homeworkId);
      if (!homework) {
        return res.status(404).json({ message: "Homework not found" });
      }

      // Students can only access active homework
      if (!hasInstructorPrivileges(user) && homework.status !== 'active') {
        return res.status(403).json({ message: "Access denied" });
      }

      const questions = await storage.getHomeworkQuestions(homeworkId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching homework questions:", error);
      res.status(500).json({ message: "Failed to fetch homework questions" });
    }
  });

  // Get existing homework submission and answers
  app.get('/api/homework/:id/submission', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const homeworkId = parseInt(req.params.id);

      if (isNaN(homeworkId)) {
        return res.status(400).json({ message: "Invalid homework ID" });
      }

      // Only students can access their own submissions
      if (user?.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get existing submissions for this homework and student
      const submissions = await storage.getHomeworkSubmissions(homeworkId, userId);
      
      if (submissions.length === 0) {
        return res.json({ submission: null, answers: [] });
      }

      // Get the latest submission
      const latestSubmission = submissions[0]; // Already ordered by startedAt desc
      
      // Get answers for this submission
      const answers = await storage.getHomeworkAnswers(latestSubmission.id);
      
      res.json({ 
        submission: latestSubmission,
        answers: answers
      });
    } catch (error) {
      console.error("Error fetching homework submission:", error);
      res.status(500).json({ message: "Failed to fetch homework submission" });
    }
  });

  // Debug endpoint to check homework submissions in database
  app.get('/api/debug/homework-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const allSubmissions = await storage.getAllHomeworkSubmissions();
      const submittedSubmissions = await storage.getAllHomeworkSubmissions('submitted');
      res.json({
        total: allSubmissions.length,
        submitted: submittedSubmissions.length,
        submissions: allSubmissions
      });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get homework submissions for current student
  app.get('/api/homework-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { status } = req.query;
      
      console.log('Homework submissions request:', { userId, userRole: user?.role, status });
      
      if (user?.role === 'student') {
        // Students can only see their own submissions
        const submissions = await storage.getHomeworkSubmissions(undefined, userId);
        console.log('Student homework submissions:', submissions.length);
        res.json(submissions);
      } else if (user?.role === 'instructor') {
        // Instructors can see all submissions with student/homework details, optionally filtered by status
        let submissions;
        if (status) {
          submissions = (await storage.getHomeworkSubmissionsWithDetails()).filter(s => s.status === status);
        } else {
          submissions = await storage.getHomeworkSubmissionsWithDetails();
        }
        console.log('All homework submissions for instructor:', submissions.length, 'with status:', status);
        res.json(submissions);
      } else {
        console.log('Access denied for user:', { userId, role: user?.role });
        return res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      console.error("Error fetching homework submissions:", error);
      res.status(500).json({ message: "Failed to fetch homework submissions" });
    }
  });

  // Save homework progress endpoints
  app.post('/api/homework/:id/save-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const homeworkId = parseInt(req.params.id);
      const { answers, currentQuestionIndex } = req.body;

      // Check if homework exists
      const homework = await storage.getHomeworkById(homeworkId);
      if (!homework) {
        return res.status(404).json({ message: "Homework not found" });
      }

      // Find existing in-progress submission or create one
      const existingSubmissions = await storage.getHomeworkSubmissions(homeworkId, userId);
      let submission = existingSubmissions.find(sub => sub.status === 'in_progress');

      if (!submission) {
        // Create a new in-progress submission
        submission = await storage.createHomeworkSubmission({
          homeworkId,
          studentId: userId,
          status: 'in_progress',
          startedAt: new Date(),
        });
      }

      // Update the submission with progress data
      const progressData = {
        answers,
        currentQuestionIndex,
        savedAt: new Date().toISOString(),
      };

      await storage.updateHomeworkSubmission(submission.id, {
        progressData,
        lastSavedAt: new Date(),
      });

      res.json({ message: "Progress saved successfully", submissionId: submission.id });
    } catch (error) {
      console.error("Error saving homework progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  app.get('/api/homework/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const homeworkId = parseInt(req.params.id);

      // Find in-progress submission
      const submissions = await storage.getHomeworkSubmissions(homeworkId, userId);
      const inProgressSubmission = submissions.find(sub => sub.status === 'in_progress');

      if (!inProgressSubmission || !inProgressSubmission.progressData) {
        return res.json({ hasProgress: false });
      }

      res.json({
        hasProgress: true,
        progressData: inProgressSubmission.progressData,
        lastSavedAt: inProgressSubmission.lastSavedAt,
      });
    } catch (error) {
      console.error("Error fetching homework progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Submit homework answers
  app.post('/api/homework/:id/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const homeworkId = parseInt(req.params.id);

      if (isNaN(homeworkId)) {
        return res.status(400).json({ message: "Invalid homework ID" });
      }

      // Only students can submit homework
      if (user?.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify homework exists and is active
      const homework = await storage.getHomeworkById(homeworkId);
      if (!homework) {
        return res.status(404).json({ message: "Homework not found" });
      }

      if (homework.status !== 'active') {
        return res.status(403).json({ message: "Homework is not available for submission" });
      }

      // Check if homework is overdue
      if (homework.dueDate) {
        const now = new Date();
        const dueDate = new Date(homework.dueDate);
        if (now > dueDate) {
          return res.status(403).json({ message: "Homework submission deadline has passed" });
        }
      }

      const { answers } = req.body;
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: "Invalid answers format" });
      }

      // Check for existing submissions
      const existingSubmissions = await storage.getHomeworkSubmissions(homeworkId, userId);
      
      let submission;
      let attemptNumber = 1;
      
      if (existingSubmissions.length > 0) {
        // Check attempt limits
        if (homework.attemptsAllowed !== -1 && existingSubmissions.length >= homework.attemptsAllowed) {
          return res.status(403).json({ message: "Maximum attempts exceeded" });
        }
        
        // Use the latest existing submission and update it
        const latestSubmission = existingSubmissions[0];
        attemptNumber = latestSubmission.attemptNumber + 1;
        
        submission = await storage.updateHomeworkSubmission(latestSubmission.id, {
          submittedAt: new Date(),
          status: 'submitted',
          attemptNumber,
          isLate: homework.dueDate ? new Date() > new Date(homework.dueDate) : false,
        });
        
        // Delete existing answers for this submission (they will be replaced)
        const existingAnswers = await storage.getHomeworkAnswers(latestSubmission.id);
        
      } else {
        // Create new submission
        submission = await storage.createHomeworkSubmission({
          homeworkId,
          studentId: userId,
          submittedAt: new Date(),
          status: 'submitted',
          startedAt: new Date(),
          attemptNumber: 1,
          isLate: homework.dueDate ? new Date() > new Date(homework.dueDate) : false,
        });
      }

      // Create new homework answers (this will overwrite previous answers)
      for (const answer of answers) {
        await storage.createHomeworkAnswer({
          submissionId: submission.id,
          questionId: answer.questionId,
          answerText: answer.answerText,
          selectedOption: answer.selectedOption,
          selectedOptions: answer.selectedOptions || null, // Store multiple selected options for MCQ
          attachmentUrl: answer.attachmentUrl || null,
          linkUrl: answer.linkUrl || null,
        });
      }

      // Auto-grade the homework submission
      try {
        console.log(`Starting auto-grading for homework submission ${submission.id}...`);
        await gradeHomeworkSubmission(submission.id);
        console.log(`Auto-graded homework submission ${submission.id} successfully`);
      } catch (error) {
        console.error(`Error auto-grading homework submission ${submission.id}:`, error);
        console.error("Auto-grading error stack:", error instanceof Error ? error.stack : String(error));
        // Continue even if grading fails - submission is still saved
      }

      res.status(201).json(submission);
    } catch (error) {
      console.error("Error submitting homework:", error);
      res.status(500).json({ message: "Failed to submit homework" });
    }
  });

  // Final Grade Calculation endpoints
  app.get('/api/student-grades/:studentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const studentId = req.params.studentId;

      // Only the student themselves or instructors can access grades
      if (user?.role === 'student' && userId !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      } else if (user?.role !== 'student' && !hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const grades = await storage.getStudentGradesBySubject(studentId);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching student grades:", error);
      res.status(500).json({ message: "Failed to fetch student grades" });
    }
  });

  app.get('/api/instructor-student-grades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const grades = await storage.getInstructorStudentGrades(userId);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching instructor student grades:", error);
      res.status(500).json({ message: "Failed to fetch instructor student grades" });
    }
  });

  // Grade Settings API endpoints
  app.get('/api/grade-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const settings = await storage.getGradeSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching grade settings:", error);
      res.status(500).json({ message: "Failed to fetch grade settings" });
    }
  });

  app.post('/api/grade-settings/global', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { assignmentCoefficient, examCoefficient } = req.body;

      // Validate coefficients
      if (typeof assignmentCoefficient !== 'number' || typeof examCoefficient !== 'number') {
        return res.status(400).json({ message: "Invalid coefficient values" });
      }

      if (assignmentCoefficient < 0 || assignmentCoefficient > 1 || examCoefficient < 0 || examCoefficient > 1) {
        return res.status(400).json({ message: "Coefficients must be between 0 and 1" });
      }

      if (Math.abs((assignmentCoefficient + examCoefficient) - 1) > 0.001) {
        return res.status(400).json({ message: "Coefficients must sum to 1.0" });
      }

      const settings = await storage.setGlobalGradeSettings({
        assignmentCoefficient,
        examCoefficient
      });

      res.json(settings);
    } catch (error) {
      console.error("Error saving global grade settings:", error);
      res.status(500).json({ message: "Failed to save global grade settings" });
    }
  });

  app.post('/api/grade-settings/course/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const courseId = parseInt(req.params.courseId);

      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (isNaN(courseId)) {
        return res.status(400).json({ message: "Invalid course ID" });
      }

      const { assignmentCoefficient, examCoefficient } = req.body;

      // Validate coefficients
      if (typeof assignmentCoefficient !== 'number' || typeof examCoefficient !== 'number') {
        return res.status(400).json({ message: "Invalid coefficient values" });
      }

      if (assignmentCoefficient < 0 || assignmentCoefficient > 1 || examCoefficient < 0 || examCoefficient > 1) {
        return res.status(400).json({ message: "Coefficients must be between 0 and 1" });
      }

      if (Math.abs((assignmentCoefficient + examCoefficient) - 1) > 0.001) {
        return res.status(400).json({ message: "Coefficients must sum to 1.0" });
      }

      // Verify course exists
      const course = await storage.getSubjectById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const settings = await storage.setCourseGradeSettings(courseId, {
        assignmentCoefficient,
        examCoefficient
      });

      res.json(settings);
    } catch (error) {
      console.error("Error saving course grade settings:", error);
      res.status(500).json({ message: "Failed to save course grade settings" });
    }
  });

  // Grade Finalization API
  app.post('/api/finalize-grades/:subjectId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.subjectId);
      if (isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid subject ID" });
      }

      // Verify subject exists
      const subject = await storage.getSubjectById(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const finalizedGrades = await storage.finalizeGradesForSubject(subjectId, userId);
      res.json({ message: "Grades finalized successfully", finalizedGrades });
    } catch (error) {
      console.error("Error finalizing grades:", error);
      res.status(500).json({ message: "Failed to finalize grades" });
    }
  });

  app.delete('/api/finalize-grades/:subjectId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.subjectId);
      if (isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid subject ID" });
      }

      await storage.unfinalizeGradesForSubject(subjectId);
      res.json({ message: "Grades unfinalized successfully" });
    } catch (error) {
      console.error("Error unfinalizing grades:", error);
      res.status(500).json({ message: "Failed to unfinalize grades" });
    }
  });

  app.get('/api/finalize-grades/:subjectId/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.subjectId);
      if (isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid subject ID" });
      }

      const isFinalized = await storage.isSubjectGradesFinalized(subjectId);
      res.json({ isFinalized });
    } catch (error) {
      console.error("Error checking finalization status:", error);
      res.status(500).json({ message: "Failed to check finalization status" });
    }
  });

  // Admin route to re-grade all submissions with zero scores
  app.post('/api/admin/regrade-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await regradeAllZeroScoreSubmissions();
      res.json({ message: "Re-grading completed successfully" });
    } catch (error) {
      console.error("Error re-grading submissions:", error);
      res.status(500).json({ message: "Re-grading failed" });
    }
  });

  app.post('/api/admin/regrade-submission/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      const result = await regradeSubmission(submissionId);
      res.json({ 
        message: "Re-grading completed successfully",
        totalScore: result.totalScore,
        maxScore: result.maxScore
      });
    } catch (error) {
      console.error("Error re-grading submission:", error);
      res.status(500).json({ message: "Re-grading failed" });
    }
  });

  // Alternative endpoint for submission re-grading (for frontend compatibility)
  app.post('/api/submissions/:id/regrade', async (req: any, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      console.log(`Re-grading submission ${submissionId} via public endpoint`);
      const result = await regradeSubmission(submissionId);
      res.json({ 
        message: "Re-grading completed successfully",
        totalScore: result.totalScore,
        maxScore: result.maxScore
      });
    } catch (error) {
      console.error("Error re-grading submission:", error);
      res.status(500).json({ message: "Re-grading failed" });
    }
  });

  // Test endpoint for enhanced drag-drop and matching grading
  app.post("/api/admin/test-grading", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { questionType, correctAnswer, studentAnswer, points } = req.body;
      
      let score = 0;
      let details = {};
      
      if (questionType === 'matching') {
        try {
          const correctAnswerParsed = typeof correctAnswer === 'string' 
            ? JSON.parse(correctAnswer) 
            : correctAnswer;
          const studentAnswerParsed = typeof studentAnswer === 'string'
            ? JSON.parse(studentAnswer || '{}')
            : studentAnswer || {};
          
          let correctMatches = 0;
          let totalMatches = 0;
          const matchResults: any[] = [];
          
          if (Array.isArray(correctAnswerParsed)) {
            totalMatches = correctAnswerParsed.length;
            const correctMapping: { [key: string]: string } = {};
            correctAnswerParsed.forEach((pair: any) => {
              if (pair.left && pair.right) {
                correctMapping[pair.left] = pair.right;
              }
            });
            
            if (typeof studentAnswerParsed === 'object' && studentAnswerParsed !== null) {
              Object.entries(studentAnswerParsed).forEach(([leftItem, rightItem]) => {
                const isCorrect = correctMapping[leftItem] === rightItem;
                if (isCorrect) correctMatches++;
                matchResults.push({ 
                  left: leftItem, 
                  studentRight: rightItem, 
                  correctRight: correctMapping[leftItem], 
                  isCorrect 
                });
              });
            }
          }
          
          score = totalMatches > 0 ? (correctMatches / totalMatches) * (points || 4) : 0;
          details = { correctMatches, totalMatches, matchResults };
        } catch (error) {
          console.error('Matching grading error:', error);
          details = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      } else if (questionType === 'drag_drop') {
        try {
          const correctAnswerParsed = typeof correctAnswer === 'string' 
            ? JSON.parse(correctAnswer) 
            : correctAnswer;
          const studentAnswerParsed = typeof studentAnswer === 'string'
            ? JSON.parse(studentAnswer || '{}')
            : studentAnswer || {};
          
          let correctPlacements = 0;
          let totalItems = 0;
          const itemToZoneMapping: { [item: string]: string } = {};
          const placementResults: any[] = [];
          
          if (correctAnswerParsed && correctAnswerParsed.zones) {
            correctAnswerParsed.zones.forEach((zone: any) => {
              if (zone.zone && Array.isArray(zone.items)) {
                zone.items.forEach((item: string) => {
                  if (item && item.trim()) {
                    itemToZoneMapping[item] = zone.zone;
                    totalItems++;
                  }
                });
              }
            });
          }
          
          if (studentAnswerParsed && typeof studentAnswerParsed === 'object') {
            if (studentAnswerParsed.zones && Array.isArray(studentAnswerParsed.zones)) {
              studentAnswerParsed.zones.forEach((studentZone: any) => {
                if (studentZone.zone && Array.isArray(studentZone.items)) {
                  studentZone.items.forEach((item: string) => {
                    const correctZone = itemToZoneMapping[item];
                    const isCorrect = correctZone === studentZone.zone;
                    if (isCorrect) correctPlacements++;
                    placementResults.push({
                      item,
                      studentZone: studentZone.zone,
                      correctZone,
                      isCorrect
                    });
                  });
                }
              });
            } else {
              Object.entries(studentAnswerParsed).forEach(([item, zone]) => {
                const correctZone = itemToZoneMapping[item];
                const isCorrect = correctZone === zone;
                if (isCorrect) correctPlacements++;
                placementResults.push({
                  item,
                  studentZone: zone,
                  correctZone,
                  isCorrect
                });
              });
            }
          }
          
          score = totalItems > 0 ? (correctPlacements / totalItems) * (points || 4) : 0;
          details = { correctPlacements, totalItems, placementResults, itemToZoneMapping };
        } catch (error) {
          console.error('Drag-drop grading error:', error);
          details = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
      
      res.json({
        questionType,
        points: points || 4,
        score: Math.round(score * 100) / 100,
        percentage: points > 0 ? Math.round((score / points) * 10000) / 100 : 0,
        details
      });
    } catch (error) {
      console.error('Test grading failed:', error);
      res.status(500).json({ 
        error: 'Test grading failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Database backup download route
  app.get('/api/backup/download/:filename', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!hasInstructorPrivileges(user)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'attached_assets', 'backups', filename);
      
      // Security check - ensure file exists and is a .sql file
      if (!filename.endsWith('.sql') || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Backup file not found" });
      }

      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/sql');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading backup:", error);
      res.status(500).json({ message: "Failed to download backup" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
