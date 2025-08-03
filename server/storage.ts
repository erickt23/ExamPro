import {
  users,
  subjects,
  questions,
  exams,
  examQuestions,
  submissions,
  answers,
  type User,
  type UpsertUser,
  type InsertSubject,
  type Subject,
  type InsertQuestion,
  type Question,
  type InsertExam,
  type Exam,
  type ExamQuestion,
  type Submission,
  type Answer,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, avg, sum, like, ilike, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Subject operations
  createSubject(subject: InsertSubject): Promise<Subject>;
  getSubjects(): Promise<Subject[]>;
  getSubjectById(id: number): Promise<Subject | undefined>;
  updateSubject(id: number, updates: Partial<InsertSubject>): Promise<Subject>;
  deleteSubject(id: number): Promise<void>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestions(instructorId: string, filters?: {
    subjectId?: number;
    questionType?: string;
    difficulty?: string;
    bloomsTaxonomy?: string;
    search?: string;
  }): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | undefined>;
  updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: number): Promise<void>;
  incrementQuestionUsage(id: number): Promise<void>;
  
  // Exam operations
  createExam(exam: InsertExam): Promise<Exam>;
  getExams(instructorId: string, status?: string, search?: string): Promise<Exam[]>;
  getActiveExamsForStudents(): Promise<Exam[]>;
  getExamById(id: number): Promise<Exam | undefined>;
  updateExam(id: number, updates: Partial<InsertExam>): Promise<Exam>;
  deleteExam(id: number): Promise<void>;
  
  // Role management
  updateUserRole(userId: string, role: "instructor" | "student"): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Exam Questions operations
  addQuestionToExam(examId: number, questionId: number, order: number, points: number): Promise<void>;
  getExamQuestions(examId: number): Promise<(ExamQuestion & { question: Question })[]>;
  removeQuestionFromExam(examId: number, questionId: number): Promise<void>;
  
  // Submission operations
  createSubmission(submission: Partial<Submission>): Promise<Submission>;
  getSubmissions(examId?: number, studentId?: string): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  updateSubmission(id: number, updates: Partial<Submission>): Promise<Submission>;
  
  // Answer operations
  createAnswer(answer: Partial<Answer>): Promise<Answer>;
  getAnswers(submissionId: number): Promise<Answer[]>;
  updateAnswer(id: number, updates: Partial<Answer>): Promise<Answer>;
  
  // Analytics operations
  getExamAnalytics(examId: number): Promise<{
    averageScore: number;
    completionRate: number;
    averageTime: number;
    totalSubmissions: number;
  }>;
  getQuestionAnalytics(questionId: number): Promise<{
    correctRate: number;
    averageScore: number;
    timesUsed: number;
  }>;
  getInstructorStats(instructorId: string): Promise<{
    totalQuestions: number;
    activeExams: number;
    totalStudents: number;
    pendingGrading: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Subject operations
  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const [subject] = await db
      .insert(subjects)
      .values(subjectData)
      .returning();
    return subject;
  }

  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects).where(eq(subjects.isActive, true)).orderBy(asc(subjects.name));
  }

  async getSubjectById(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async updateSubject(id: number, updates: Partial<InsertSubject>): Promise<Subject> {
    const [subject] = await db
      .update(subjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subjects.id, id))
      .returning();
    return subject;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.update(subjects).set({ isActive: false }).where(eq(subjects.id, id));
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db
      .insert(questions)
      .values(question)
      .returning();
    return newQuestion;
  }

  async getQuestions(instructorId: string, filters?: {
    subjectId?: number;
    questionType?: string;
    difficulty?: string;
    bloomsTaxonomy?: string;
    search?: string;
  }): Promise<Question[]> {
    try {
      console.log('getQuestions called with filters:', filters);
      
      // Start with basic conditions
      const conditions = [eq(questions.instructorId, instructorId), eq(questions.isActive, true)];

      if (filters?.subjectId) {
        conditions.push(eq(questions.subjectId, filters.subjectId));
      }
      if (filters?.questionType) {
        conditions.push(eq(questions.questionType, filters.questionType as any));
      }
      if (filters?.difficulty) {
        conditions.push(eq(questions.difficulty, filters.difficulty as any));
      }
      if (filters?.bloomsTaxonomy) {
        conditions.push(eq(questions.bloomsTaxonomy, filters.bloomsTaxonomy as any));
      }
      if (filters?.search) {
        conditions.push(
          or(
            ilike(questions.title, `%${filters.search}%`),
            ilike(questions.questionText, `%${filters.search}%`)
          )!
        );
      }

      console.log('Executing query with conditions:', conditions.length);

      // Simple query - return exactly what's in the database
      const questionsResult = await db
        .select()
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt));

      console.log('Query executed successfully, got', questionsResult.length, 'questions');

      // Return the raw results without modification to avoid any type issues
      return questionsResult as Question[];

    } catch (error) {
      console.error('Database error in getQuestions:', error);
      throw error;
    }
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id));
    return question;
  }

  async updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: number): Promise<void> {
    await db
      .update(questions)
      .set({ isActive: false })
      .where(eq(questions.id, id));
  }

  async incrementQuestionUsage(id: number): Promise<void> {
    await db
      .update(questions)
      .set({ usageCount: sql`${questions.usageCount} + 1` })
      .where(eq(questions.id, id));
  }

  // Exam operations
  async createExam(exam: InsertExam): Promise<Exam> {
    const [newExam] = await db
      .insert(exams)
      .values(exam)
      .returning();
    return newExam;
  }

  async getExams(instructorId: string, status?: string, search?: string): Promise<Exam[]> {
    console.log('getExams called with:', { instructorId, status, search });
    const conditions = [eq(exams.instructorId, instructorId)];
    
    if (status) {
      conditions.push(eq(exams.status, status as any));
    }

    // Add search condition if provided
    if (search && search.trim()) {
      conditions.push(
        or(
          ilike(exams.title, `%${search.trim()}%`),
          ilike(exams.description, `%${search.trim()}%`)
        )!
      );
    }

    const results = await db
      .select()
      .from(exams)
      .where(and(...conditions))
      .orderBy(desc(exams.createdAt));

    console.log('Query results:', results.length, 'exams found');
    return results;
  }

  async getActiveExamsForStudents(): Promise<Exam[]> {
    return db
      .select()
      .from(exams)
      .where(eq(exams.status, 'active'))
      .orderBy(desc(exams.createdAt));
  }

  async getExamById(id: number): Promise<Exam | undefined> {
    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, id));
    return exam;
  }

  async updateExam(id: number, updates: Partial<InsertExam>): Promise<Exam> {
    const [exam] = await db
      .update(exams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(exams.id, id))
      .returning();
    return exam;
  }

  async deleteExam(id: number): Promise<void> {
    await db.delete(exams).where(eq(exams.id, id));
  }

  // Exam Questions operations
  async addQuestionToExam(examId: number, questionId: number, order: number, points: number): Promise<void> {
    await db.insert(examQuestions).values({
      examId,
      questionId,
      order,
      points,
    });
    await this.incrementQuestionUsage(questionId);
  }

  async getExamQuestions(examId: number): Promise<(ExamQuestion & { question: Question })[]> {
    const results = await db
      .select({
        id: examQuestions.id,
        examId: examQuestions.examId,
        questionId: examQuestions.questionId,
        order: examQuestions.order,
        points: examQuestions.points,
        question: questions,
      })
      .from(examQuestions)
      .innerJoin(questions, eq(examQuestions.questionId, questions.id))
      .where(eq(examQuestions.examId, examId))
      .orderBy(asc(examQuestions.order));
    
    return results as (ExamQuestion & { question: Question })[];
  }

  async removeQuestionFromExam(examId: number, questionId: number): Promise<void> {
    await db
      .delete(examQuestions)
      .where(and(
        eq(examQuestions.examId, examId),
        eq(examQuestions.questionId, questionId)
      ));
  }

  // Submission operations
  async createSubmission(submission: Partial<Submission>): Promise<Submission> {
    const [newSubmission] = await db
      .insert(submissions)
      .values(submission as any)
      .returning();
    return newSubmission;
  }

  async getSubmissions(examId?: number, studentId?: string): Promise<Submission[]> {
    const conditions = [];
    if (examId) conditions.push(eq(submissions.examId, examId));
    if (studentId) conditions.push(eq(submissions.studentId, studentId));

    return db
      .select()
      .from(submissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(submissions.startedAt));
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id));
    return submission;
  }

  async updateSubmission(id: number, updates: Partial<Submission>): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  // Answer operations
  async createAnswer(answer: Partial<Answer>): Promise<Answer> {
    const [newAnswer] = await db
      .insert(answers)
      .values(answer as any)
      .returning();
    return newAnswer;
  }

  async getAnswers(submissionId: number): Promise<Answer[]> {
    return db
      .select()
      .from(answers)
      .where(eq(answers.submissionId, submissionId));
  }

  async updateAnswer(id: number, updates: Partial<Answer>): Promise<Answer> {
    const [answer] = await db
      .update(answers)
      .set(updates)
      .where(eq(answers.id, id))
      .returning();
    return answer;
  }

  // Analytics operations
  async getExamAnalytics(examId: number): Promise<{
    averageScore: number;
    completionRate: number;
    averageTime: number;
    totalSubmissions: number;
  }> {
    const [stats] = await db
      .select({
        averageScore: avg(submissions.totalScore),
        averageTime: avg(submissions.timeTaken),
        totalSubmissions: count(),
        completedSubmissions: count(submissions.submittedAt),
      })
      .from(submissions)
      .where(eq(submissions.examId, examId));

    return {
      averageScore: Number(stats.averageScore) || 0,
      completionRate: stats.totalSubmissions > 0 
        ? (Number(stats.completedSubmissions) / Number(stats.totalSubmissions)) * 100 
        : 0,
      averageTime: Number(stats.averageTime) || 0,
      totalSubmissions: Number(stats.totalSubmissions),
    };
  }

  async getQuestionAnalytics(questionId: number): Promise<{
    correctRate: number;
    averageScore: number;
    timesUsed: number;
  }> {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId));

    const [stats] = await db
      .select({
        averageScore: avg(answers.score),
        totalAnswers: count(),
      })
      .from(answers)
      .where(eq(answers.questionId, questionId));

    return {
      correctRate: Number(stats.averageScore) > 0 
        ? (Number(stats.averageScore) / Number(question?.points || 1)) * 100 
        : 0,
      averageScore: Number(stats.averageScore) || 0,
      timesUsed: question?.usageCount || 0,
    };
  }

  async getInstructorStats(instructorId: string): Promise<{
    totalQuestions: number;
    activeExams: number;
    totalStudents: number;
    pendingGrading: number;
  }> {
    const [questionCount] = await db
      .select({ count: count() })
      .from(questions)
      .where(and(
        eq(questions.instructorId, instructorId),
        eq(questions.isActive, true)
      ));

    const [examCount] = await db
      .select({ count: count() })
      .from(exams)
      .where(and(
        eq(exams.instructorId, instructorId),
        eq(exams.status, 'active')
      ));

    const [pendingCount] = await db
      .select({ count: count() })
      .from(submissions)
      .innerJoin(exams, eq(submissions.examId, exams.id))
      .where(and(
        eq(exams.instructorId, instructorId),
        eq(submissions.status, 'submitted')
      ));

    // Get unique students enrolled in instructor's exams
    const studentCount = await db
      .selectDistinct({ studentId: submissions.studentId })
      .from(submissions)
      .innerJoin(exams, eq(submissions.examId, exams.id))
      .where(eq(exams.instructorId, instructorId));

    return {
      totalQuestions: Number(questionCount.count),
      activeExams: Number(examCount.count),
      totalStudents: studentCount.length,
      pendingGrading: Number(pendingCount.count),
    };
  }

  // Role management
  async updateUserRole(userId: string, role: "instructor" | "student"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(asc(users.email));
  }
}

export const storage = new DatabaseStorage();
