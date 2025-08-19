import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuestionSchema, insertExamSchema, insertHomeworkAssignmentSchema, insertGradeSettingsSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { subject, type, difficulty, bloomsTaxonomy, search, category } = req.query;
      const questions = await storage.getQuestions(userId, {
        subjectId: subject ? parseInt(subject as string) : undefined,
        questionType: type as string,
        difficulty: difficulty as string,
        bloomsTaxonomy: bloomsTaxonomy as string,
        search: search as string,
        category: (category as 'exam' | 'homework') || 'exam', // Default to exam if not specified
      });
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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

  // Excel import endpoint
  app.post('/api/questions/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'instructor') {
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
          
          // Create question using existing storage interface
          const question = await storage.createQuestion({
            ...questionData,
            instructorId: userId
          });
          
          results.imported++;
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
      
      if (user?.role === 'instructor') {
        const { status, search } = req.query;
        console.log('Search params received:', { status, search, userId });
        const exams = await storage.getExams(userId, status as string, search as string);
        console.log('Exams returned:', exams.length, 'exams');
        res.json(exams);
      } else {
        // For students, return exams they can take
        const exams = await storage.getActiveExamsForStudents();
        res.json(exams);
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
      
      if (user?.role !== 'instructor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const examData = insertExamSchema.parse({
        ...req.body,
        instructorId: userId,
      });
      
      const exam = await storage.createExam(examData);
      res.status(201).json(exam);
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
      const exam = await storage.getExamById(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Get exam questions
      const examQuestions = await storage.getExamQuestions(examId);
      
      res.json({ ...exam, questions: examQuestions });
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
      
      if (user?.role !== 'instructor') {
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

      const updates = insertExamSchema.partial().parse(req.body);
      const updatedExam = await storage.updateExam(examId, updates);
      
      res.json(updatedExam);
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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

  // Exam question management
  app.get('/api/exams/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const examId = parseInt(req.params.id);
      const examQuestions = await storage.getExamQuestions(examId);
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
      
      if (user?.role !== 'instructor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const exam = await storage.getExamById(examId);
      if (!exam || exam.instructorId !== userId) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const { questionId, order, points } = req.body;
      await storage.addQuestionToExam(examId, questionId, order, points);
      
      res.status(201).json({ message: "Question added to exam" });
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
      
      if (user?.role !== 'instructor') {
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

        // Auto-grade only MCQ questions
        if (question.questionType === 'multiple_choice' && 
            answer.selectedOption === question.correctAnswer) {
          score = question.points;
        }

        totalScore += score;

        const createdAnswer = await storage.createAnswer({
          submissionId: submission.id,
          questionId: answer.questionId,
          answerText: answer.answerText,
          selectedOption: answer.selectedOption,
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
      
      if (user?.role === 'instructor') {
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
        
        // Hide scores for pending submissions
        const filteredSubmissions = submissions.map(submission => {
          if (submission.status === 'pending') {
            return {
              ...submission,
              totalScore: null,
              maxScore: null
            };
          }
          return submission;
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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

    if (user?.role !== 'instructor') {
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
      
      if (user?.role === 'instructor') {
        const { status, search } = req.query;
        const homework = await storage.getHomework(userId, status as string, search as string);
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { subject, type, difficulty, bloomsTaxonomy, search } = req.query;
      const questions = await storage.getQuestions(userId, {
        subjectId: subject ? parseInt(subject as string) : undefined,
        questionType: type as string,
        difficulty: difficulty as string,
        bloomsTaxonomy: bloomsTaxonomy as string,
        search: search as string,
        category: 'homework', // Only show homework questions
      });
      
      res.json(questions);
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
      
      if (user?.role !== 'instructor') {
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
      if (user?.role !== 'instructor' && homework.status !== 'active') {
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
      if (user?.role !== 'instructor' && homework.status !== 'active') {
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
        });
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
      } else if (user?.role !== 'student' && user?.role !== 'instructor') {
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

      if (user?.role !== 'instructor') {
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

      if (user?.role !== 'instructor') {
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

      if (user?.role !== 'instructor') {
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

      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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
      
      if (user?.role !== 'instructor') {
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

  const httpServer = createServer(app);
  return httpServer;
}
