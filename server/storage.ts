import {
  users,
  subjects,
  questions,
  exams,
  examQuestions,
  submissions,
  answers,
  homeworkAssignments,
  homeworkQuestions,
  homeworkSubmissions,
  homeworkAnswers,
  gradeSettings,
  proctoringSettings,
  finalizedGrades,
  extraCredits,
  examAssignments,
  homeworkAssignmentStudents,
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
  type InsertHomeworkAssignment,
  type HomeworkAssignment,
  type HomeworkQuestion,
  type HomeworkSubmission,
  type HomeworkAnswer,
  type InsertGradeSettings,
  type GradeSettings,
  type InsertProctoringSettings,
  type ProctoringSettings,
  type InsertFinalizedGrade,
  type FinalizedGrade,
  type InsertExtraCredit,
  type ExtraCredit,
  type InsertExamAssignment,
  type ExamAssignment,
  type InsertHomeworkAssignmentStudent,
  type HomeworkAssignmentStudent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, avg, sum, like, ilike, inArray, sql, ne, isNull } from "drizzle-orm";

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
    gradeLevel?: string;
    search?: string;
    category?: 'exam' | 'homework'; // NEW: Filter by question category
    page?: number;
    limit?: number;
  }): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }>;
  getQuestionById(id: number): Promise<Question | undefined>;
  updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: number): Promise<void>;
  incrementQuestionUsage(id: number): Promise<void>;
  
  // Admin question operations
  createAdminQuestion(question: InsertQuestion & { 
    createdByAdmin: boolean; 
    visibilityType: 'all_instructors' | 'specific_instructors';
    authorizedInstructorIds?: string[];
  }): Promise<Question>;
  getAdminQuestions(filters?: {
    subjectId?: number;
    questionType?: string;
    difficulty?: string;
    bloomsTaxonomy?: string;
    gradeLevel?: string;
    search?: string;
    category?: 'exam' | 'homework';
    visibilityType?: 'all_instructors' | 'specific_instructors';
    page?: number;
    limit?: number;
  }): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }>;
  updateAdminQuestion(id: number, updates: Partial<InsertQuestion & { 
    visibilityType?: 'all_instructors' | 'specific_instructors';
    authorizedInstructorIds?: string[];
  }>): Promise<Question>;
  getQuestionsForInstructor(instructorId: string, userRole: string, filters?: {
    subjectId?: number;
    questionType?: string;
    difficulty?: string;
    bloomsTaxonomy?: string;
    gradeLevel?: string;
    search?: string;
    category?: 'exam' | 'homework';
    page?: number;
    limit?: number;
  }): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }>;
  
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
  updateAnswerAttachment(answerId: number, attachmentUrl: string | null, linkUrl: string | null): Promise<Answer>;
  
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
  
  // Homework operations
  createHomework(homework: InsertHomeworkAssignment): Promise<HomeworkAssignment>;
  getHomework(instructorId: string, options?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ homeworkAssignments: HomeworkAssignment[]; total: number; page: number; totalPages: number; } | HomeworkAssignment[]>;
  getActiveHomeworkForStudents(): Promise<HomeworkAssignment[]>;
  getHomeworkById(id: number): Promise<HomeworkAssignment | undefined>;
  updateHomework(id: number, updates: Partial<InsertHomeworkAssignment>): Promise<HomeworkAssignment>;
  deleteHomework(id: number): Promise<void>;
  
  // Homework Questions operations
  addQuestionToHomework(homeworkId: number, questionId: number, order: number, points: number): Promise<void>;
  getHomeworkQuestions(homeworkId: number): Promise<(HomeworkQuestion & { question: Question })[]>;
  removeQuestionFromHomework(homeworkId: number, questionId: number): Promise<void>;
  
  // Homework Submission operations
  createHomeworkSubmission(submission: Partial<HomeworkSubmission>): Promise<HomeworkSubmission>;
  getHomeworkSubmissions(homeworkId?: number, studentId?: string): Promise<HomeworkSubmission[]>;
  getHomeworkSubmissionById(id: number): Promise<HomeworkSubmission | undefined>;
  updateHomeworkSubmission(id: number, updates: Partial<HomeworkSubmission>): Promise<HomeworkSubmission>;
  getHomeworkAssignmentById(id: number): Promise<HomeworkAssignment | undefined>;
  getAllHomeworkSubmissions(status?: string): Promise<HomeworkSubmission[]>;
  
  // Homework Answer operations
  createHomeworkAnswer(answer: Partial<HomeworkAnswer>): Promise<HomeworkAnswer>;
  getHomeworkAnswers(submissionId: number): Promise<HomeworkAnswer[]>;
  updateHomeworkAnswer(id: number, updates: Partial<HomeworkAnswer>): Promise<HomeworkAnswer>;

  // Grade calculation operations
  getStudentGradesBySubject(studentId: string): Promise<{
    subjectId: number;
    subjectName: string;
    totalAssignmentScore: number;
    totalAssignmentMaxScore: number;
    totalExamScore: number;
    totalExamMaxScore: number;
  }[]>;
  getInstructorStudentGrades(instructorId: string): Promise<{
    studentId: string;
    studentName: string;
    subjectId: number;
    subjectName: string;
    totalAssignmentScore: number;
    totalAssignmentMaxScore: number;
    totalExamScore: number;
    totalExamMaxScore: number;
  }[]>;

  // Grade settings operations
  getGradeSettings(): Promise<{ global: GradeSettings; courses: Record<number, GradeSettings> }>;
  setGlobalGradeSettings(settings: { assignmentCoefficient: number; examCoefficient: number }): Promise<GradeSettings>;
  setCourseGradeSettings(courseId: number, settings: { assignmentCoefficient: number; examCoefficient: number }): Promise<GradeSettings>;
  getGradeSettingsForCourse(courseId?: number): Promise<GradeSettings | undefined>;
  
  // Proctoring settings operations
  getGlobalProctoringSettings(): Promise<ProctoringSettings | undefined>;
  setGlobalProctoringSettings(settings: InsertProctoringSettings): Promise<ProctoringSettings>;
  
  // Grade finalization operations
  finalizeGradesForSubject(subjectId: number, finalizedBy: string): Promise<FinalizedGrade[]>;
  isSubjectGradesFinalized(subjectId: number): Promise<boolean>;
  getFinalizedGradesForSubject(subjectId: number): Promise<FinalizedGrade[]>;
  unfinalizeGradesForSubject(subjectId: number): Promise<void>;
  
  // Extra credit operations
  createExtraCreditForSubmission(submissionId: number, extraCredit: { points: number; reason: string }, grantedBy: string): Promise<ExtraCredit>;
  createExtraCreditForHomeworkSubmission(homeworkSubmissionId: number, extraCredit: { points: number; reason: string }, grantedBy: string): Promise<ExtraCredit>;
  listExtraCreditsForSubmission(submissionId: number): Promise<ExtraCredit[]>;
  listExtraCreditsForHomeworkSubmission(homeworkSubmissionId: number): Promise<ExtraCredit[]>;
  deleteExtraCredit(creditId: number): Promise<void>;
  getExtraCreditTotalsForSubmissions(submissionIds: number[]): Promise<Record<number, number>>;
  getExtraCreditTotalsForHomeworkSubmissions(homeworkSubmissionIds: number[]): Promise<Record<number, number>>;
  
  // Exam assignment operations
  assignStudentsToExam(examId: number, studentIds: string[], assignedBy: string): Promise<void>;
  removeStudentsFromExam(examId: number, studentIds: string[]): Promise<void>;
  getAssignedStudentsForExam(examId: number): Promise<User[]>;
  isStudentAssignedToExam(examId: number, studentId: string): Promise<boolean>;
  getAssignedExamsForStudent(studentId: string): Promise<number[]>;
  
  // Homework assignment operations
  assignStudentsToHomework(homeworkId: number, studentIds: string[], assignedBy: string): Promise<void>;
  removeStudentsFromHomework(homeworkId: number, studentIds: string[]): Promise<void>;
  getAssignedStudentsForHomework(homeworkId: number): Promise<User[]>;
  isStudentAssignedToHomework(homeworkId: number, studentId: string): Promise<boolean>;
  getAssignedHomeworkForStudent(studentId: string): Promise<number[]>;
}

// In-memory fallback storage for when database is unavailable
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userData.id, user);
    return user;
  }

  // Stub implementations for other required methods
  async createSubject(): Promise<Subject> { throw new Error('Database unavailable'); }
  async getSubjects(): Promise<Subject[]> { return []; }
  async getSubjectById(): Promise<Subject | undefined> { return undefined; }
  async updateSubject(): Promise<Subject> { throw new Error('Database unavailable'); }
  async deleteSubject(): Promise<void> { throw new Error('Database unavailable'); }
  async getSubmissionsWithDetails(examId?: number, studentId?: string): Promise<any[]> { return []; }
  async createQuestion(): Promise<Question> { throw new Error('Database unavailable'); }
  async getQuestions(instructorId: string, filters?: any): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }> {
    return { questions: [], total: 0, page: 1, totalPages: 0 };
  }
  async getQuestionById(): Promise<Question | undefined> { return undefined; }
  async updateQuestion(): Promise<Question> { throw new Error('Database unavailable'); }
  async deleteQuestion(): Promise<void> { throw new Error('Database unavailable'); }
  async incrementQuestionUsage(): Promise<void> { throw new Error('Database unavailable'); }
  
  // Admin question method stubs
  async createAdminQuestion(): Promise<Question> { throw new Error('Database unavailable'); }
  async getAdminQuestions(): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }> {
    return { questions: [], total: 0, page: 1, totalPages: 0 };
  }
  async updateAdminQuestion(): Promise<Question> { throw new Error('Database unavailable'); }
  async getQuestionsForInstructor(instructorId: string, userRole: string, filters?: any): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }> {
    return { questions: [], total: 0, page: 1, totalPages: 0 };
  }
  
  async createExam(): Promise<Exam> { throw new Error('Database unavailable'); }
  async getExams(instructorId: string, status?: string, search?: string): Promise<Exam[]> { return []; }
  async getActiveExamsForStudents(): Promise<Exam[]> { return []; }
  async getExamById(): Promise<Exam | undefined> { return undefined; }
  async updateExam(): Promise<Exam> { throw new Error('Database unavailable'); }
  async deleteExam(): Promise<void> { throw new Error('Database unavailable'); }
  async updateUserRole(): Promise<User> { throw new Error('Database unavailable'); }
  async getAllUsers(): Promise<User[]> { return Array.from(this.users.values()); }
  async addQuestionToExam(): Promise<void> { throw new Error('Database unavailable'); }
  async getExamQuestions(): Promise<(ExamQuestion & { question: Question })[]> { return []; }
  async removeQuestionFromExam(): Promise<void> { throw new Error('Database unavailable'); }
  async createSubmission(): Promise<Submission> { throw new Error('Database unavailable'); }
  async getSubmissions(examId?: number, studentId?: string): Promise<Submission[]> { return []; }
  async getSubmissionById(): Promise<Submission | undefined> { return undefined; }
  async updateSubmission(): Promise<Submission> { throw new Error('Database unavailable'); }
  async createAnswer(): Promise<Answer> { throw new Error('Database unavailable'); }
  async getAnswers(): Promise<Answer[]> { return []; }
  async updateAnswer(): Promise<Answer> { throw new Error('Database unavailable'); }
  async updateAnswerAttachment(): Promise<Answer> { throw new Error('Database unavailable'); }
  async getExamAnalytics(): Promise<any> { throw new Error('Database unavailable'); }
  async getQuestionAnalytics(): Promise<any> { throw new Error('Database unavailable'); }
  async getInstructorStats(): Promise<any> { throw new Error('Database unavailable'); }
  async createHomework(): Promise<HomeworkAssignment> { throw new Error('Database unavailable'); }
  async getHomework(): Promise<any> { return []; }
  async getActiveHomeworkForStudents(): Promise<HomeworkAssignment[]> { return []; }
  async getHomeworkById(): Promise<HomeworkAssignment | undefined> { return undefined; }
  async updateHomework(): Promise<HomeworkAssignment> { throw new Error('Database unavailable'); }
  async deleteHomework(): Promise<void> { throw new Error('Database unavailable'); }
  async addQuestionToHomework(): Promise<void> { throw new Error('Database unavailable'); }
  async getHomeworkQuestions(): Promise<(HomeworkQuestion & { question: Question })[]> { return []; }
  async removeQuestionFromHomework(): Promise<void> { throw new Error('Database unavailable'); }
  async createHomeworkSubmission(): Promise<HomeworkSubmission> { throw new Error('Database unavailable'); }
  async getHomeworkSubmissions(): Promise<HomeworkSubmission[]> { return []; }
  async getHomeworkSubmissionById(): Promise<HomeworkSubmission | undefined> { return undefined; }
  async updateHomeworkSubmission(): Promise<HomeworkSubmission> { throw new Error('Database unavailable'); }
  async getHomeworkAssignmentById(): Promise<HomeworkAssignment | undefined> { return undefined; }
  async getAllHomeworkSubmissions(): Promise<HomeworkSubmission[]> { return []; }
  async createHomeworkAnswer(): Promise<HomeworkAnswer> { throw new Error('Database unavailable'); }
  async getHomeworkAnswers(): Promise<HomeworkAnswer[]> { return []; }
  async updateHomeworkAnswer(): Promise<HomeworkAnswer> { throw new Error('Database unavailable'); }
  async getStudentGradesBySubject(): Promise<any[]> { return []; }
  async getInstructorStudentGrades(): Promise<any[]> { return []; }
  async getGradeSettings(): Promise<any> { return { global: { assignmentCoefficient: "0.4", examCoefficient: "0.6" }, courses: {} }; }
  async setGlobalGradeSettings(): Promise<GradeSettings> { throw new Error('Database unavailable'); }
  async setCourseGradeSettings(): Promise<GradeSettings> { throw new Error('Database unavailable'); }
  async getGradeSettingsForCourse(): Promise<GradeSettings | undefined> { return undefined; }
  async getGlobalProctoringSettings(): Promise<ProctoringSettings | undefined> { return undefined; }
  async setGlobalProctoringSettings(): Promise<ProctoringSettings> { throw new Error('Database unavailable'); }
  async finalizeGradesForSubject(): Promise<FinalizedGrade[]> { throw new Error('Database unavailable'); }
  async isSubjectGradesFinalized(): Promise<boolean> { return false; }
  async getFinalizedGradesForSubject(): Promise<FinalizedGrade[]> { return []; }
  async unfinalizeGradesForSubject(): Promise<void> { throw new Error('Database unavailable'); }
  async createExtraCreditForSubmission(): Promise<ExtraCredit> { throw new Error('Database unavailable'); }
  async createExtraCreditForHomeworkSubmission(): Promise<ExtraCredit> { throw new Error('Database unavailable'); }
  async listExtraCreditsForSubmission(): Promise<ExtraCredit[]> { return []; }
  async listExtraCreditsForHomeworkSubmission(): Promise<ExtraCredit[]> { return []; }
  async deleteExtraCredit(): Promise<void> { throw new Error('Database unavailable'); }
  async getExtraCreditTotalsForSubmissions(): Promise<Record<number, number>> { return {}; }
  async getExtraCreditTotalsForHomeworkSubmissions(): Promise<Record<number, number>> { return {}; }
}

// Create a memory storage instance for fallback
const memoryStorage = new MemoryStorage();

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.warn('Database getUser failed, falling back to memory storage:', error);
      return memoryStorage.getUser(id);
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Try to find existing user by ID first
      const existingUser = await this.getUser(userData.id);
      
      if (existingUser) {
        // Update existing user
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      } else {
        // Check if email already exists for a different user
        const [existingEmailUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email || ''));
        
        if (existingEmailUser && existingEmailUser.id !== userData.id) {
          // Update the existing user with the new ID and other data
          const [user] = await db
            .update(users)
            .set({
              id: userData.id, // Update to new ID
              firstName: userData.firstName,
              lastName: userData.lastName,
              profileImageUrl: userData.profileImageUrl,
              role: userData.role,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email || ''))
            .returning();
          return user;
        } else {
          // Insert new user
          const [user] = await db
            .insert(users)
            .values(userData)
            .returning();
          return user;
        }
      }
    } catch (error) {
      console.warn('Database upsertUser failed, falling back to memory storage:', error);
      return memoryStorage.upsertUser(userData);
    }
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
    gradeLevel?: string;
    search?: string;
    category?: 'exam' | 'homework';
    page?: number;
    limit?: number;
  }): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }> {
    try {
      console.log('getQuestions called with filters:', filters);
      
      // Start with basic conditions
      const conditions = [eq(questions.instructorId, instructorId), eq(questions.isActive, true)];
      
      // Filter by category (default to 'exam' for backward compatibility)
      if (filters?.category) {
        conditions.push(eq(questions.category, filters.category));
      } else {
        conditions.push(eq(questions.category, 'exam')); // Default to exam questions
      }

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

      // Get pagination parameters
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(and(...conditions));
      
      const total = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated questions
      const questionsResult = await db
        .select()
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt))
        .limit(limit)
        .offset(offset);

      console.log('Query executed successfully, got', questionsResult.length, 'questions out of', total, 'total');

      // Return paginated results
      return {
        questions: questionsResult as Question[],
        total,
        page,
        totalPages
      };

    } catch (error) {
      console.warn('Database getQuestions failed, falling back to memory storage:', error);
      return memoryStorage.getQuestions(instructorId, filters);
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

  // Admin question operations
  async createAdminQuestion(question: InsertQuestion & { 
    createdByAdmin: boolean; 
    visibilityType: 'all_instructors' | 'specific_instructors';
    authorizedInstructorIds?: string[];
  }): Promise<Question> {
    const [newQuestion] = await db
      .insert(questions)
      .values(question)
      .returning();
    return newQuestion;
  }

  async getAdminQuestions(filters?: {
    subjectId?: number;
    questionType?: string;
    difficulty?: string;
    bloomsTaxonomy?: string;
    gradeLevel?: string;
    search?: string;
    category?: 'exam' | 'homework';
    visibilityType?: 'all_instructors' | 'specific_instructors';
    page?: number;
    limit?: number;
  }): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }> {
    try {
      // Start with admin-created questions only
      const conditions = [eq(questions.createdByAdmin, true), eq(questions.isActive, true)];
      
      // Apply filters
      if (filters?.category) {
        conditions.push(eq(questions.category, filters.category));
      }
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
      if (filters?.visibilityType) {
        conditions.push(eq(questions.visibilityType, filters.visibilityType as any));
      }
      if (filters?.search) {
        conditions.push(
          or(
            ilike(questions.title, `%${filters.search}%`),
            ilike(questions.questionText, `%${filters.search}%`)
          )!
        );
      }

      // Get pagination parameters
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(and(...conditions));
      
      const total = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated questions
      const questionsResult = await db
        .select()
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        questions: questionsResult as Question[],
        total,
        page,
        totalPages
      };

    } catch (error) {
      console.error('Error fetching admin questions:', error);
      throw error;
    }
  }

  async updateAdminQuestion(id: number, updates: Partial<InsertQuestion & { 
    visibilityType?: 'all_instructors' | 'specific_instructors';
    authorizedInstructorIds?: string[];
  }>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(questions.id, id), eq(questions.createdByAdmin, true)))
      .returning();
    return question;
  }

  async getQuestionsForInstructor(instructorId: string, userRole: string, filters?: {
    subjectId?: number;
    questionType?: string;
    difficulty?: string;
    bloomsTaxonomy?: string;
    gradeLevel?: string;
    search?: string;
    category?: 'exam' | 'homework';
    page?: number;
    limit?: number;
  }): Promise<{ questions: Question[]; total: number; page: number; totalPages: number }> {
    try {
      // Base conditions for active questions
      let conditions = [eq(questions.isActive, true)];
      
      // Filter by category (default to 'exam' for backward compatibility)
      if (filters?.category) {
        conditions.push(eq(questions.category, filters.category));
      } else {
        conditions.push(eq(questions.category, 'exam'));
      }

      // If user is admin, show all questions
      if (userRole === 'admin') {
        // Admin can see all questions
      } else {
        // For instructors, show:
        // 1. Questions they created themselves
        // 2. Admin questions with 'all_instructors' visibility
        // 3. Admin questions with 'specific_instructors' visibility where they are authorized
        const visibilityConditions = or(
          eq(questions.instructorId, instructorId), // Own questions
          and(eq(questions.createdByAdmin, true), eq(questions.visibilityType, 'all_instructors')), // Public admin questions
          and(
            eq(questions.createdByAdmin, true), 
            eq(questions.visibilityType, 'specific_instructors'),
            sql`${instructorId} = ANY(${questions.authorizedInstructorIds})` // Authorized for specific questions
          )
        );
        conditions.push(visibilityConditions!);
      }

      // Apply additional filters
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

      // Get pagination parameters
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(and(...conditions));
      
      const total = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated questions
      const questionsResult = await db
        .select()
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        questions: questionsResult as Question[],
        total,
        page,
        totalPages
      };

    } catch (error) {
      console.error('Error fetching questions for instructor:', error);
      throw error;
    }
  }

  // Admin function to get ALL questions from all instructors
  async getAllQuestionsForAdmin(filters?: {
    subjectId?: number;
    questionType?: string;
    difficulty?: string;
    bloomsTaxonomy?: string;
    gradeLevel?: string;
    search?: string;
    category?: 'exam' | 'homework';
    createdBy?: string; // 'all', 'admins', 'instructors'
    visibilityType?: 'all_instructors' | 'specific_instructors';
    page?: number;
    limit?: number;
  }): Promise<{ questions: any[]; total: number; page: number; totalPages: number }> {
    try {
      // Base conditions for active questions
      let conditions = [eq(questions.isActive, true)];
      
      // Apply filters
      if (filters?.category) {
        conditions.push(eq(questions.category, filters.category));
      }
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
      if (filters?.visibilityType) {
        conditions.push(eq(questions.visibilityType, filters.visibilityType as any));
      }
      if (filters?.createdBy === 'admins') {
        conditions.push(eq(questions.createdByAdmin, true));
      } else if (filters?.createdBy === 'instructors') {
        conditions.push(eq(questions.createdByAdmin, false));
      }
      if (filters?.search) {
        conditions.push(
          or(
            ilike(questions.title, `%${filters.search}%`),
            ilike(questions.questionText, `%${filters.search}%`)
          )!
        );
      }

      // Get pagination parameters
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(and(...conditions));
      
      const total = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated questions with join to get instructor and subject info
      const questionsResult = await db
        .select({
          id: questions.id,
          instructorId: questions.instructorId,
          title: questions.title,
          questionText: questions.questionText,
          questionType: questions.questionType,
          category: questions.category,
          options: questions.options,
          correctAnswer: questions.correctAnswer,
          correctAnswers: questions.correctAnswers,
          explanation: questions.explanation,
          attachmentUrl: questions.attachmentUrl,
          subjectId: questions.subjectId,
          difficulty: questions.difficulty,
          bloomsTaxonomy: questions.bloomsTaxonomy,
          gradeLevel: questions.gradeLevel,
          points: questions.points,
          timeLimit: questions.timeLimit,
          version: questions.version,
          isActive: questions.isActive,
          usageCount: questions.usageCount,
          createdByAdmin: questions.createdByAdmin,
          visibilityType: questions.visibilityType,
          authorizedInstructorIds: questions.authorizedInstructorIds,
          createdAt: questions.createdAt,
          updatedAt: questions.updatedAt,
          // Instructor info
          instructorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          // Subject info
          subject: sql<any>`json_build_object('id', ${subjects.id}, 'name', ${subjects.name})`,
        })
        .from(questions)
        .leftJoin(users, eq(questions.instructorId, users.id))
        .leftJoin(subjects, eq(questions.subjectId, subjects.id))
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        questions: questionsResult,
        total,
        page,
        totalPages
      };

    } catch (error) {
      console.error('Error fetching all questions for admin:', error);
      throw error;
    }
  }

  // Update question visibility settings
  async updateQuestionVisibility(id: number, updates: {
    visibilityType?: 'all_instructors' | 'specific_instructors';
    authorizedInstructorIds?: string[] | null;
  }): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return question;
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
    try {
      console.log('getExams called with:', { instructorId, status, search });
      
      // Special handling for "completed" status
      if (status === 'completed') {
        return this.getCompletedExams(instructorId, search);
      }
      
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
    } catch (error) {
      console.warn('Database getExams failed, falling back to memory storage:', error);
      return memoryStorage.getExams(instructorId, status, search);
    }
  }

  private async getCompletedExams(instructorId: string, search?: string): Promise<Exam[]> {
    const now = new Date();
    const conditions = [eq(exams.instructorId, instructorId)];

    // Add search condition if provided
    if (search && search.trim()) {
      conditions.push(
        or(
          ilike(exams.title, `%${search.trim()}%`),
          ilike(exams.description, `%${search.trim()}%`)
        )!
      );
    }

    // Get all exams for this instructor (excluding drafts)
    const allExams = await db
      .select()
      .from(exams)
      .where(and(...conditions, ne(exams.status, 'draft')))
      .orderBy(desc(exams.createdAt));

    // Filter to only completed exams
    const completedExams = [];
    
    for (const exam of allExams) {
      let isCompleted = false;
      
      // Check if exam is explicitly marked as completed or archived
      if (exam.status === 'completed' || exam.status === 'archived') {
        isCompleted = true;
      }
      // Check if exam has passed its deadline
      else if (exam.availableUntil && new Date(exam.availableUntil) < now) {
        isCompleted = true;
      }
      // Check if exam has submissions (students have taken it)
      else if (exam.status === 'active') {
        const examSubmissions = await db
          .select({ id: submissions.id })
          .from(submissions)
          .where(eq(submissions.examId, exam.id))
          .limit(1);
        
        if (examSubmissions.length > 0) {
          isCompleted = true;
        }
      }
      
      if (isCompleted) {
        // Return exam with computed "completed" status for UI display
        completedExams.push({
          ...exam,
          status: 'completed' as const
        });
      }
    }

    console.log('Completed exams found:', completedExams.length);
    return completedExams;
  }

  async getActiveExamsForStudents(): Promise<Exam[]> {
    try {
      return db
        .select()
        .from(exams)
        .where(eq(exams.status, 'active'))
        .orderBy(desc(exams.createdAt));
    } catch (error) {
      console.warn('Database getActiveExamsForStudents failed, falling back to memory storage:', error);
      return memoryStorage.getActiveExamsForStudents();
    }
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
    try {
      const conditions = [];
      if (examId) conditions.push(eq(submissions.examId, examId));
      if (studentId) conditions.push(eq(submissions.studentId, studentId));

      return db
        .select()
        .from(submissions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(submissions.startedAt));
    } catch (error) {
      console.warn('Database getSubmissions failed, falling back to memory storage:', error);
      return memoryStorage.getSubmissions(examId, studentId);
    }
  }

  async getSubmissionsWithDetails(examId?: number, studentId?: string): Promise<any[]> {
    try {
      const conditions = [];
      if (examId) conditions.push(eq(submissions.examId, examId));
      if (studentId) conditions.push(eq(submissions.studentId, studentId));

      return db
        .select({
          id: submissions.id,
          examId: submissions.examId,
          studentId: submissions.studentId,
          attemptNumber: submissions.attemptNumber,
          startedAt: submissions.startedAt,
          submittedAt: submissions.submittedAt,
          timeTaken: submissions.timeTaken,
          totalScore: submissions.totalScore,
          maxScore: submissions.maxScore,
          status: submissions.status,
          isLate: submissions.isLate,
          student: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
          exam: {
            id: exams.id,
            title: exams.title,
            description: exams.description,
            subjectId: exams.subjectId,
          }
        })
        .from(submissions)
        .innerJoin(users, eq(submissions.studentId, users.id))
        .innerJoin(exams, eq(submissions.examId, exams.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(submissions.startedAt));
    } catch (error) {
      console.warn('Database getSubmissionsWithDetails failed, falling back to empty array:', error);
      return []; // Return empty array since detailed submission data is not available
    }
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

  async updateAnswerAttachment(answerId: number, attachmentUrl: string | null, linkUrl: string | null): Promise<Answer> {
    const [answer] = await db
      .update(answers)
      .set({ 
        attachmentUrl,
        linkUrl 
      })
      .where(eq(answers.id, answerId))
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

  // Homework operations
  async createHomework(homeworkData: InsertHomeworkAssignment): Promise<HomeworkAssignment> {
    const [homework] = await db
      .insert(homeworkAssignments)
      .values(homeworkData)
      .returning();
    return homework;
  }

  async getHomework(instructorId: string, options?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ homeworkAssignments: HomeworkAssignment[]; total: number; page: number; totalPages: number; } | HomeworkAssignment[]> {
    try {
      const { status, search, page, limit } = options || {};
      const conditions = [eq(homeworkAssignments.instructorId, instructorId)];
      
      if (status) {
        conditions.push(eq(homeworkAssignments.status, status as any));
      }
      
      if (search) {
        conditions.push(
          or(
            ilike(homeworkAssignments.title, `%${search}%`),
            ilike(homeworkAssignments.description, `%${search}%`)
          )!
        );
      }
      
      // If pagination is requested
      if (page !== undefined && limit !== undefined) {
        const offset = (page - 1) * limit;
        
        // Get total count for pagination
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(homeworkAssignments)
          .where(and(...conditions));
        
        const total = Number(count);
        const totalPages = Math.ceil(total / limit);
        
        // Get paginated results
        const homeworkResult = await db
          .select()
          .from(homeworkAssignments)
          .where(and(...conditions))
          .orderBy(desc(homeworkAssignments.createdAt))
          .limit(limit)
          .offset(offset);
        
        return {
          homeworkAssignments: homeworkResult,
          total,
          page,
          totalPages
        };
      }
      
      // Return all results if no pagination
      const homeworkResult = await db
        .select()
        .from(homeworkAssignments)
        .where(and(...conditions))
        .orderBy(desc(homeworkAssignments.createdAt));
      
      return homeworkResult;
    } catch (error) {
      console.error('Database error in getHomework:', error);
      throw error;
    }
  }

  async getActiveHomeworkForStudents(): Promise<HomeworkAssignment[]> {
    const now = new Date();
    return await db
      .select()
      .from(homeworkAssignments)
      .where(
        and(
          eq(homeworkAssignments.status, 'active'),
          or(
            sql`${homeworkAssignments.dueDate} IS NULL`,
            sql`${homeworkAssignments.dueDate} > ${now}`
          )
        )
      )
      .orderBy(asc(homeworkAssignments.dueDate));
  }

  async getHomeworkById(id: number): Promise<HomeworkAssignment | undefined> {
    const [homework] = await db
      .select()
      .from(homeworkAssignments)
      .where(eq(homeworkAssignments.id, id));
    return homework;
  }

  async updateHomework(id: number, updates: Partial<InsertHomeworkAssignment>): Promise<HomeworkAssignment> {
    const processedUpdates = { ...updates };
    
    // Convert dueDate string to Date object if present
    if (processedUpdates.dueDate && typeof processedUpdates.dueDate === 'string') {
      processedUpdates.dueDate = new Date(processedUpdates.dueDate);
    }
    
    const [homework] = await db
      .update(homeworkAssignments)
      .set({ ...processedUpdates, updatedAt: new Date() })
      .where(eq(homeworkAssignments.id, id))
      .returning();
    return homework;
  }

  async deleteHomework(id: number): Promise<void> {
    await db.delete(homeworkAssignments).where(eq(homeworkAssignments.id, id));
  }

  // Homework Questions operations
  async addQuestionToHomework(homeworkId: number, questionId: number, order: number, points: number): Promise<void> {
    await db.insert(homeworkQuestions).values({
      homeworkId,
      questionId,
      order,
      points,
    });
  }

  async getHomeworkQuestions(homeworkId: number): Promise<(HomeworkQuestion & { question: Question })[]> {
    return await db
      .select({
        id: homeworkQuestions.id,
        homeworkId: homeworkQuestions.homeworkId,
        questionId: homeworkQuestions.questionId,
        order: homeworkQuestions.order,
        points: homeworkQuestions.points,
        question: questions,
      })
      .from(homeworkQuestions)
      .innerJoin(questions, eq(homeworkQuestions.questionId, questions.id))
      .where(eq(homeworkQuestions.homeworkId, homeworkId))
      .orderBy(asc(homeworkQuestions.order));
  }

  async removeQuestionFromHomework(homeworkId: number, questionId: number): Promise<void> {
    await db
      .delete(homeworkQuestions)
      .where(
        and(
          eq(homeworkQuestions.homeworkId, homeworkId),
          eq(homeworkQuestions.questionId, questionId)
        )
      );
  }

  // Homework Submission operations
  async createHomeworkSubmission(submissionData: Partial<HomeworkSubmission>): Promise<HomeworkSubmission> {
    const [submission] = await db
      .insert(homeworkSubmissions)
      .values(submissionData as any)
      .returning();
    return submission;
  }

  async getHomeworkSubmissions(homeworkId?: number, studentId?: string): Promise<HomeworkSubmission[]> {
    const conditions = [];
    
    if (homeworkId) {
      conditions.push(eq(homeworkSubmissions.homeworkId, homeworkId));
    }
    
    if (studentId) {
      conditions.push(eq(homeworkSubmissions.studentId, studentId));
    }
    
    return await db
      .select()
      .from(homeworkSubmissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(homeworkSubmissions.startedAt));
  }

  async getHomeworkSubmissionsWithDetails(homeworkId?: number, studentId?: string): Promise<any[]> {
    const conditions = [];
    
    if (homeworkId) {
      conditions.push(eq(homeworkSubmissions.homeworkId, homeworkId));
    }
    
    if (studentId) {
      conditions.push(eq(homeworkSubmissions.studentId, studentId));
    }
    
    return await db
      .select({
        id: homeworkSubmissions.id,
        homeworkId: homeworkSubmissions.homeworkId,
        studentId: homeworkSubmissions.studentId,
        attemptNumber: homeworkSubmissions.attemptNumber,
        startedAt: homeworkSubmissions.startedAt,
        submittedAt: homeworkSubmissions.submittedAt,
        totalScore: homeworkSubmissions.totalScore,
        maxScore: homeworkSubmissions.maxScore,
        status: homeworkSubmissions.status,
        isLate: homeworkSubmissions.isLate,
        student: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        homework: {
          id: homeworkAssignments.id,
          title: homeworkAssignments.title,
          description: homeworkAssignments.description,
          subjectId: homeworkAssignments.subjectId,
        }
      })
      .from(homeworkSubmissions)
      .innerJoin(users, eq(homeworkSubmissions.studentId, users.id))
      .innerJoin(homeworkAssignments, eq(homeworkSubmissions.homeworkId, homeworkAssignments.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(homeworkSubmissions.startedAt));
  }

  async getHomeworkSubmissionById(id: number): Promise<HomeworkSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.id, id));
    return submission;
  }

  async updateHomeworkSubmission(id: number, updates: Partial<HomeworkSubmission>): Promise<HomeworkSubmission> {
    const [submission] = await db
      .update(homeworkSubmissions)
      .set(updates)
      .where(eq(homeworkSubmissions.id, id))
      .returning();
    return submission;
  }

  async getHomeworkAssignmentById(id: number): Promise<HomeworkAssignment | undefined> {
    const [homework] = await db
      .select()
      .from(homeworkAssignments)
      .where(eq(homeworkAssignments.id, id));
    return homework;
  }

  async getAllHomeworkSubmissions(status?: string): Promise<HomeworkSubmission[]> {
    if (status) {
      const submissions = await db
        .select()
        .from(homeworkSubmissions)
        .where(eq(homeworkSubmissions.status, status as any))
        .orderBy(homeworkSubmissions.submittedAt);
      return submissions;
    } else {
      const submissions = await db
        .select()
        .from(homeworkSubmissions)
        .orderBy(homeworkSubmissions.submittedAt);
      return submissions;
    }
  }

  // Homework Answer operations
  async createHomeworkAnswer(answerData: Partial<HomeworkAnswer>): Promise<HomeworkAnswer> {
    const [answer] = await db
      .insert(homeworkAnswers)
      .values(answerData as any)
      .returning();
    return answer;
  }

  async getHomeworkAnswers(submissionId: number): Promise<HomeworkAnswer[]> {
    return await db
      .select()
      .from(homeworkAnswers)
      .where(eq(homeworkAnswers.submissionId, submissionId));
  }

  async updateHomeworkAnswer(id: number, updates: Partial<HomeworkAnswer>): Promise<HomeworkAnswer> {
    const [answer] = await db
      .update(homeworkAnswers)
      .set(updates)
      .where(eq(homeworkAnswers.id, id))
      .returning();
    return answer;
  }

  // Grade calculation operations
  async getStudentGradesBySubject(studentId: string): Promise<{
    subjectId: number;
    subjectName: string;
    totalAssignmentScore: number;
    totalAssignmentMaxScore: number;
    totalExamScore: number;
    totalExamMaxScore: number;
  }[]> {
    // Get homework (assignment) scores by subject
    const homeworkScores = await db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        totalScore: sql<number>`COALESCE(SUM(CASE WHEN ${homeworkSubmissions.status} = 'graded' THEN ${homeworkSubmissions.totalScore} ELSE 0 END), 0)`,
        totalMaxScore: sql<number>`COALESCE(SUM(CASE WHEN ${homeworkSubmissions.status} = 'graded' THEN ${homeworkSubmissions.maxScore} ELSE 0 END), 0)`,
      })
      .from(subjects)
      .leftJoin(homeworkAssignments, eq(subjects.id, homeworkAssignments.subjectId))
      .leftJoin(homeworkSubmissions, and(
        eq(homeworkAssignments.id, homeworkSubmissions.homeworkId),
        eq(homeworkSubmissions.studentId, studentId)
      ))
      .groupBy(subjects.id, subjects.name);

    // Get exam scores by subject
    const examScores = await db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        totalScore: sql<number>`COALESCE(SUM(CASE WHEN ${submissions.status} = 'graded' THEN ${submissions.totalScore} ELSE 0 END), 0)`,
        totalMaxScore: sql<number>`COALESCE(SUM(CASE WHEN ${submissions.status} = 'graded' THEN ${submissions.maxScore} ELSE 0 END), 0)`,
      })
      .from(subjects)
      .leftJoin(exams, eq(subjects.id, exams.subjectId))
      .leftJoin(submissions, and(
        eq(exams.id, submissions.examId),
        eq(submissions.studentId, studentId)
      ))
      .groupBy(subjects.id, subjects.name);

    // Combine homework and exam scores
    const subjectMap = new Map<number, {
      subjectId: number;
      subjectName: string;
      totalAssignmentScore: number;
      totalAssignmentMaxScore: number;
      totalExamScore: number;
      totalExamMaxScore: number;
    }>();

    // Initialize with homework scores
    for (const homework of homeworkScores) {
      subjectMap.set(homework.subjectId, {
        subjectId: homework.subjectId,
        subjectName: homework.subjectName,
        totalAssignmentScore: Number(homework.totalScore) || 0,
        totalAssignmentMaxScore: Number(homework.totalMaxScore) || 0,
        totalExamScore: 0,
        totalExamMaxScore: 0,
      });
    }

    // Add exam scores
    for (const exam of examScores) {
      const existing = subjectMap.get(exam.subjectId);
      if (existing) {
        existing.totalExamScore = Number(exam.totalScore) || 0;
        existing.totalExamMaxScore = Number(exam.totalMaxScore) || 0;
      } else {
        subjectMap.set(exam.subjectId, {
          subjectId: exam.subjectId,
          subjectName: exam.subjectName,
          totalAssignmentScore: 0,
          totalAssignmentMaxScore: 0,
          totalExamScore: Number(exam.totalScore) || 0,
          totalExamMaxScore: Number(exam.totalMaxScore) || 0,
        });
      }
    }

    return Array.from(subjectMap.values());
  }

  async getInstructorStudentGrades(instructorId: string): Promise<{
    studentId: string;
    studentName: string;
    subjectId: number;
    subjectName: string;
    totalAssignmentScore: number;
    totalAssignmentMaxScore: number;
    totalExamScore: number;
    totalExamMaxScore: number;
  }[]> {
    // Get all students who have submissions for this instructor's courses
    const studentsWithSubmissions = await db
      .select({
        studentId: users.id,
        studentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(users)
      .where(eq(users.role, 'student'))
      .groupBy(users.id, users.firstName, users.lastName);

    const result: {
      studentId: string;
      studentName: string;
      subjectId: number;
      subjectName: string;
      totalAssignmentScore: number;
      totalAssignmentMaxScore: number;
      totalExamScore: number;
      totalExamMaxScore: number;
    }[] = [];

    // For each student, get their grades by subject for this instructor
    for (const student of studentsWithSubmissions) {
      // Get homework scores for instructor's assignments
      const homeworkScores = await db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          totalScore: sql<number>`COALESCE(SUM(CASE WHEN ${homeworkSubmissions.status} = 'graded' THEN ${homeworkSubmissions.totalScore} ELSE 0 END), 0)`,
          totalMaxScore: sql<number>`COALESCE(SUM(CASE WHEN ${homeworkSubmissions.status} = 'graded' THEN ${homeworkSubmissions.maxScore} ELSE 0 END), 0)`,
        })
        .from(subjects)
        .leftJoin(homeworkAssignments, and(
          eq(subjects.id, homeworkAssignments.subjectId),
          eq(homeworkAssignments.instructorId, instructorId)
        ))
        .leftJoin(homeworkSubmissions, and(
          eq(homeworkAssignments.id, homeworkSubmissions.homeworkId),
          eq(homeworkSubmissions.studentId, student.studentId)
        ))
        .groupBy(subjects.id, subjects.name);

      // Get exam scores for instructor's exams
      const examScores = await db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          totalScore: sql<number>`COALESCE(SUM(CASE WHEN ${submissions.status} = 'graded' THEN ${submissions.totalScore} ELSE 0 END), 0)`,
          totalMaxScore: sql<number>`COALESCE(SUM(CASE WHEN ${submissions.status} = 'graded' THEN ${submissions.maxScore} ELSE 0 END), 0)`,
        })
        .from(subjects)
        .leftJoin(exams, and(
          eq(subjects.id, exams.subjectId),
          eq(exams.instructorId, instructorId)
        ))
        .leftJoin(submissions, and(
          eq(exams.id, submissions.examId),
          eq(submissions.studentId, student.studentId)
        ))
        .groupBy(subjects.id, subjects.name);

      // Combine scores by subject
      const subjectMap = new Map<number, {
        subjectId: number;
        subjectName: string;
        totalAssignmentScore: number;
        totalAssignmentMaxScore: number;
        totalExamScore: number;
        totalExamMaxScore: number;
      }>();

      // Add homework scores
      for (const homework of homeworkScores) {
        if (homework.totalMaxScore > 0) { // Only include subjects with actual homework
          subjectMap.set(homework.subjectId, {
            subjectId: homework.subjectId,
            subjectName: homework.subjectName,
            totalAssignmentScore: Number(homework.totalScore) || 0,
            totalAssignmentMaxScore: Number(homework.totalMaxScore) || 0,
            totalExamScore: 0,
            totalExamMaxScore: 0,
          });
        }
      }

      // Add exam scores
      for (const exam of examScores) {
        if (exam.totalMaxScore > 0) { // Only include subjects with actual exams
          const existing = subjectMap.get(exam.subjectId);
          if (existing) {
            existing.totalExamScore = Number(exam.totalScore) || 0;
            existing.totalExamMaxScore = Number(exam.totalMaxScore) || 0;
          } else {
            subjectMap.set(exam.subjectId, {
              subjectId: exam.subjectId,
              subjectName: exam.subjectName,
              totalAssignmentScore: 0,
              totalAssignmentMaxScore: 0,
              totalExamScore: Number(exam.totalScore) || 0,
              totalExamMaxScore: Number(exam.totalMaxScore) || 0,
            });
          }
        }
      }

      // Add to result only if student has grades in at least one subject
      const subjectEntries = Array.from(subjectMap.values());
      for (const grades of subjectEntries) {
        if (grades.totalAssignmentMaxScore > 0 || grades.totalExamMaxScore > 0) {
          result.push({
            studentId: student.studentId,
            studentName: student.studentName,
            ...grades,
          });
        }
      }
    }

    return result;
  }

  // Grade settings operations
  async getGradeSettings(): Promise<{ global: GradeSettings; courses: Record<number, GradeSettings> }> {
    const settings = await db.select().from(gradeSettings);
    
    const global = settings.find(s => s.courseId === null) || {
      id: 0,
      courseId: null,
      assignmentCoefficient: '0.4000',
      examCoefficient: '0.6000',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as GradeSettings;

    const courses: Record<number, GradeSettings> = {};
    settings.filter(s => s.courseId !== null).forEach(s => {
      if (s.courseId) {
        courses[s.courseId] = s;
      }
    });

    return { global, courses };
  }

  async setGlobalGradeSettings(settingsData: { assignmentCoefficient: number; examCoefficient: number }): Promise<GradeSettings> {
    const existingGlobal = await db
      .select()
      .from(gradeSettings)
      .where(isNull(gradeSettings.courseId))
      .limit(1);

    if (existingGlobal.length > 0) {
      const [updated] = await db
        .update(gradeSettings)
        .set({
          assignmentCoefficient: settingsData.assignmentCoefficient.toString(),
          examCoefficient: settingsData.examCoefficient.toString(),
          updatedAt: new Date(),
        })
        .where(isNull(gradeSettings.courseId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(gradeSettings)
        .values({
          courseId: null,
          assignmentCoefficient: settingsData.assignmentCoefficient.toString(),
          examCoefficient: settingsData.examCoefficient.toString(),
        })
        .returning();
      return created;
    }
  }

  async setCourseGradeSettings(courseId: number, settingsData: { assignmentCoefficient: number; examCoefficient: number }): Promise<GradeSettings> {
    const existingCourse = await db
      .select()
      .from(gradeSettings)
      .where(eq(gradeSettings.courseId, courseId))
      .limit(1);

    if (existingCourse.length > 0) {
      const [updated] = await db
        .update(gradeSettings)
        .set({
          assignmentCoefficient: settingsData.assignmentCoefficient.toString(),
          examCoefficient: settingsData.examCoefficient.toString(),
          updatedAt: new Date(),
        })
        .where(eq(gradeSettings.courseId, courseId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(gradeSettings)
        .values({
          courseId,
          assignmentCoefficient: settingsData.assignmentCoefficient.toString(),
          examCoefficient: settingsData.examCoefficient.toString(),
        })
        .returning();
      return created;
    }
  }

  async getGradeSettingsForCourse(courseId?: number): Promise<GradeSettings | undefined> {
    if (courseId) {
      const [courseSetting] = await db
        .select()
        .from(gradeSettings)
        .where(eq(gradeSettings.courseId, courseId))
        .limit(1);
      
      if (courseSetting) return courseSetting;
    }

    // Fall back to global settings
    const [globalSetting] = await db
      .select()
      .from(gradeSettings)
      .where(isNull(gradeSettings.courseId))
      .limit(1);
    
    return globalSetting;
  }

  // Global proctoring settings operations
  async getGlobalProctoringSettings(): Promise<ProctoringSettings | undefined> {
    const [settings] = await db
      .select()
      .from(proctoringSettings)
      .limit(1);
    
    return settings;
  }

  async setGlobalProctoringSettings(settingsData: InsertProctoringSettings): Promise<ProctoringSettings> {
    const existing = await db
      .select()
      .from(proctoringSettings)
      .limit(1);

    if (existing.length > 0) {
      // Update existing settings
      const [updated] = await db
        .update(proctoringSettings)
        .set({
          ...settingsData,
          updatedAt: new Date(),
        })
        .where(eq(proctoringSettings.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(proctoringSettings)
        .values(settingsData)
        .returning();
      return created;
    }
  }

  // Grade finalization operations
  async finalizeGradesForSubject(subjectId: number, finalizedBy: string): Promise<FinalizedGrade[]> {
    // Get all students with grades for this subject
    const studentGrades = await this.getInstructorStudentGrades(finalizedBy);
    const subjectGrades = studentGrades.filter(grade => grade.subjectId === subjectId);
    
    // Get current grade settings for this subject
    const gradeSettings = await this.getGradeSettingsForCourse(subjectId);
    const assignmentCoeff = gradeSettings ? Number(gradeSettings.assignmentCoefficient) : 0.4;
    const examCoeff = gradeSettings ? Number(gradeSettings.examCoefficient) : 0.6;
    
    // Get all submission IDs for extra credit calculation
    const allSubmissionIds: number[] = [];
    const allHomeworkSubmissionIds: number[] = [];
    
    // Extract submission IDs from student grades for batch extra credit lookup
    for (const grade of subjectGrades) {
      // Get submission IDs for this student's exams in this subject
      const examSubmissions = await this.getSubmissions(undefined, grade.studentId);
      for (const submission of examSubmissions) {
        if (submission.status === 'graded') {
          allSubmissionIds.push(submission.id);
        }
      }
      
      // Get homework submission IDs for this student in this subject
      const homeworkSubmissions = await this.getHomeworkSubmissions(undefined, grade.studentId);
      for (const hwSubmission of homeworkSubmissions) {
        if (hwSubmission.status === 'graded') {
          allHomeworkSubmissionIds.push(hwSubmission.id);
        }
      }
    }

    // Get extra credit totals in batch
    const examExtraCredits = await this.getExtraCreditTotalsForSubmissions(allSubmissionIds);
    const homeworkExtraCredits = await this.getExtraCreditTotalsForHomeworkSubmissions(allHomeworkSubmissionIds);

    // Create finalized grade records
    const finalizedGradeData: InsertFinalizedGrade[] = [];
    
    for (const grade of subjectGrades) {
      // Calculate extra credits for this student's submissions
      let totalExamExtraCredits = 0;
      let totalHomeworkExtraCredits = 0;
      
      // Get exam submissions for this student and calculate extra credits
      const examSubmissions = await this.getSubmissions(undefined, grade.studentId);
      for (const submission of examSubmissions) {
        if (submission.status === 'graded' && examExtraCredits[submission.id]) {
          totalExamExtraCredits += examExtraCredits[submission.id];
        }
      }
      
      // Get homework submissions for this student and calculate extra credits
      const homeworkSubmissions = await this.getHomeworkSubmissions(undefined, grade.studentId);
      for (const hwSubmission of homeworkSubmissions) {
        if (hwSubmission.status === 'graded' && homeworkExtraCredits[hwSubmission.id]) {
          totalHomeworkExtraCredits += homeworkExtraCredits[hwSubmission.id];
        }
      }
      
      // Calculate scores with extra credits included
      const examScoreWithExtra = grade.totalExamScore + totalExamExtraCredits;
      const assignmentScoreWithExtra = grade.totalAssignmentScore + totalHomeworkExtraCredits;
      
      // Calculate percentages with extra credits (can exceed 100% based on architect recommendation)
      const assignmentPercentage = grade.totalAssignmentMaxScore > 0 
        ? (assignmentScoreWithExtra / grade.totalAssignmentMaxScore) * 100 
        : 0;
      const examPercentage = grade.totalExamMaxScore > 0 
        ? (examScoreWithExtra / grade.totalExamMaxScore) * 100 
        : 0;
      const finalGrade = (assignmentPercentage * assignmentCoeff) + (examPercentage * examCoeff);

      finalizedGradeData.push({
        studentId: grade.studentId,
        subjectId: grade.subjectId,
        finalGrade: finalGrade.toFixed(2),
        assignmentScore: assignmentScoreWithExtra.toFixed(2),
        assignmentMaxScore: grade.totalAssignmentMaxScore.toFixed(2),
        examScore: examScoreWithExtra.toFixed(2),
        examMaxScore: grade.totalExamMaxScore.toFixed(2),
        assignmentCoefficient: assignmentCoeff.toFixed(4),
        examCoefficient: examCoeff.toFixed(4),
        finalizedBy,
      });
    }
    
    // Insert finalized grades (replace if they already exist)
    const results: FinalizedGrade[] = [];
    for (const gradeData of finalizedGradeData) {
      const [finalizedGrade] = await db
        .insert(finalizedGrades)
        .values(gradeData)
        .onConflictDoUpdate({
          target: [finalizedGrades.studentId, finalizedGrades.subjectId],
          set: {
            ...gradeData,
            finalizedAt: new Date(),
          },
        })
        .returning();
      results.push(finalizedGrade);
    }
    
    return results;
  }

  async isSubjectGradesFinalized(subjectId: number): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(finalizedGrades)
      .where(eq(finalizedGrades.subjectId, subjectId));
    
    return result.count > 0;
  }

  async getFinalizedGradesForSubject(subjectId: number): Promise<FinalizedGrade[]> {
    return await db
      .select()
      .from(finalizedGrades)
      .where(eq(finalizedGrades.subjectId, subjectId));
  }

  async unfinalizeGradesForSubject(subjectId: number): Promise<void> {
    await db
      .delete(finalizedGrades)
      .where(eq(finalizedGrades.subjectId, subjectId));
  }

  // Extra credit operations
  async createExtraCreditForSubmission(submissionId: number, extraCredit: { points: number; reason: string }, grantedBy: string): Promise<ExtraCredit> {
    // Get submission to verify it exists and get student ID
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const [extraCreditRecord] = await db
      .insert(extraCredits)
      .values({
        submissionId,
        homeworkSubmissionId: null,
        studentId: submission.studentId,
        points: extraCredit.points.toString(),
        reason: extraCredit.reason,
        grantedBy,
      })
      .returning();
    return extraCreditRecord;
  }

  async createExtraCreditForHomeworkSubmission(homeworkSubmissionId: number, extraCredit: { points: number; reason: string }, grantedBy: string): Promise<ExtraCredit> {
    // Get homework submission to verify it exists and get student ID
    const homeworkSubmission = await this.getHomeworkSubmissionById(homeworkSubmissionId);
    if (!homeworkSubmission) {
      throw new Error('Homework submission not found');
    }

    const [extraCreditRecord] = await db
      .insert(extraCredits)
      .values({
        submissionId: null,
        homeworkSubmissionId,
        studentId: homeworkSubmission.studentId,
        points: extraCredit.points.toString(),
        reason: extraCredit.reason,
        grantedBy,
      })
      .returning();
    return extraCreditRecord;
  }

  async listExtraCreditsForSubmission(submissionId: number): Promise<ExtraCredit[]> {
    return await db
      .select()
      .from(extraCredits)
      .where(eq(extraCredits.submissionId, submissionId))
      .orderBy(desc(extraCredits.grantedAt));
  }

  async listExtraCreditsForHomeworkSubmission(homeworkSubmissionId: number): Promise<ExtraCredit[]> {
    return await db
      .select()
      .from(extraCredits)
      .where(eq(extraCredits.homeworkSubmissionId, homeworkSubmissionId))
      .orderBy(desc(extraCredits.grantedAt));
  }

  async deleteExtraCredit(creditId: number): Promise<void> {
    await db
      .delete(extraCredits)
      .where(eq(extraCredits.id, creditId));
  }

  async getExtraCreditTotalsForSubmissions(submissionIds: number[]): Promise<Record<number, number>> {
    if (submissionIds.length === 0) return {};

    const results = await db
      .select({
        submissionId: extraCredits.submissionId,
        total: sum(extraCredits.points).as('total'),
      })
      .from(extraCredits)
      .where(inArray(extraCredits.submissionId, submissionIds))
      .groupBy(extraCredits.submissionId);

    const totals: Record<number, number> = {};
    for (const result of results) {
      if (result.submissionId) {
        totals[result.submissionId] = Number(result.total) || 0;
      }
    }
    return totals;
  }

  async getExtraCreditTotalsForHomeworkSubmissions(homeworkSubmissionIds: number[]): Promise<Record<number, number>> {
    if (homeworkSubmissionIds.length === 0) return {};

    const results = await db
      .select({
        homeworkSubmissionId: extraCredits.homeworkSubmissionId,
        total: sum(extraCredits.points).as('total'),
      })
      .from(extraCredits)
      .where(inArray(extraCredits.homeworkSubmissionId, homeworkSubmissionIds))
      .groupBy(extraCredits.homeworkSubmissionId);

    const totals: Record<number, number> = {};
    for (const result of results) {
      if (result.homeworkSubmissionId) {
        totals[result.homeworkSubmissionId] = Number(result.total) || 0;
      }
    }
    return totals;
  }

  async assignStudentsToExam(examId: number, studentIds: string[], assignedBy: string): Promise<void> {
    if (studentIds.length === 0) return;

    const assignments = studentIds.map(studentId => ({
      examId,
      studentId,
      assignedBy,
    }));

    await db.insert(examAssignments).values(assignments).onConflictDoNothing();
  }

  async removeStudentsFromExam(examId: number, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return;

    await db
      .delete(examAssignments)
      .where(
        and(
          eq(examAssignments.examId, examId),
          inArray(examAssignments.studentId, studentIds)
        )
      );
  }

  async getAssignedStudentsForExam(examId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(examAssignments)
      .innerJoin(users, eq(examAssignments.studentId, users.id))
      .where(eq(examAssignments.examId, examId))
      .orderBy(asc(users.lastName), asc(users.firstName));

    return result.map(r => r.user);
  }

  async isStudentAssignedToExam(examId: number, studentId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(examAssignments)
      .where(
        and(
          eq(examAssignments.examId, examId),
          eq(examAssignments.studentId, studentId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async getAssignedExamsForStudent(studentId: string): Promise<number[]> {
    const result = await db
      .select({ examId: examAssignments.examId })
      .from(examAssignments)
      .where(eq(examAssignments.studentId, studentId));

    return result.map(r => r.examId);
  }

  async assignStudentsToHomework(homeworkId: number, studentIds: string[], assignedBy: string): Promise<void> {
    if (studentIds.length === 0) return;

    const assignments = studentIds.map(studentId => ({
      homeworkId,
      studentId,
      assignedBy,
    }));

    await db.insert(homeworkAssignmentStudents).values(assignments).onConflictDoNothing();
  }

  async removeStudentsFromHomework(homeworkId: number, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return;

    await db
      .delete(homeworkAssignmentStudents)
      .where(
        and(
          eq(homeworkAssignmentStudents.homeworkId, homeworkId),
          inArray(homeworkAssignmentStudents.studentId, studentIds)
        )
      );
  }

  async getAssignedStudentsForHomework(homeworkId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(homeworkAssignmentStudents)
      .innerJoin(users, eq(homeworkAssignmentStudents.studentId, users.id))
      .where(eq(homeworkAssignmentStudents.homeworkId, homeworkId))
      .orderBy(asc(users.lastName), asc(users.firstName));

    return result.map(r => r.user);
  }

  async isStudentAssignedToHomework(homeworkId: number, studentId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(homeworkAssignmentStudents)
      .where(
        and(
          eq(homeworkAssignmentStudents.homeworkId, homeworkId),
          eq(homeworkAssignmentStudents.studentId, studentId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async getAssignedHomeworkForStudent(studentId: string): Promise<number[]> {
    const result = await db
      .select({ homeworkId: homeworkAssignmentStudents.homeworkId })
      .from(homeworkAssignmentStudents)
      .where(eq(homeworkAssignmentStudents.studentId, studentId));

    return result.map(r => r.homeworkId);
  }
}

export const storage = new DatabaseStorage();
