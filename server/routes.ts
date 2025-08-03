import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuestionSchema, insertExamSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";

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
  const validTypes = ['multiple_choice', 'short_answer', 'essay', 'fill_blank'];
  if (!validTypes.includes(row.questionType)) {
    throw new Error(`Invalid question type: ${row.questionType}`);
  }

  // Parse options for multiple choice
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

  // Question routes
  app.get('/api/questions', isAuthenticated, async (req: any, res) => {
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

        await storage.createAnswer({
          submissionId: submission.id,
          questionId: answer.questionId,
          answerText: answer.answerText,
          selectedOption: answer.selectedOption,
          score: score.toString(),
          maxScore: question.points.toString(),
        });
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
        let submissions = await storage.getSubmissions(
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

  const httpServer = createServer(app);
  return httpServer;
}
