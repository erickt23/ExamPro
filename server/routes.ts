import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuestionSchema, insertExamSchema } from "@shared/schema";
import { z } from "zod";

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

      const { subjectId, questionType, difficulty, search } = req.query;
      const questions = await storage.getQuestions(userId, {
        subjectId: subjectId ? parseInt(subjectId as string) : undefined,
        questionType: questionType as string,
        difficulty: difficulty as string,
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

  // Exam routes
  app.get('/api/exams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role === 'instructor') {
        const { status } = req.query;
        const exams = await storage.getExams(userId, status as string);
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

      const updates = insertExamSchema.partial().parse(req.body);
      const updatedExam = await storage.updateExam(examId, updates);
      
      res.json(updatedExam);
    } catch (error) {
      console.error("Error updating exam:", error);
      res.status(500).json({ message: "Failed to update exam" });
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

      // Determine final status based on exam settings and question types
      let finalStatus: 'graded' | 'pending' = 'graded';
      
      // If show results immediately is disabled AND there are subjective questions, mark as pending
      if (!exam.showResultsImmediately && hasSubjectiveQuestions) {
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
      const { examId, studentId } = req.query;
      
      if (user?.role === 'instructor') {
        const submissions = await storage.getSubmissions(
          examId ? parseInt(examId as string) : undefined,
          studentId as string
        );
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
