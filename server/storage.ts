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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, avg, sum, like, ilike, inArray, sql, ne } from "drizzle-orm";

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
    category?: 'exam' | 'homework'; // NEW: Filter by question category
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
  getHomework(instructorId: string, status?: string, search?: string): Promise<HomeworkAssignment[]>;
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
    category?: 'exam' | 'homework';
  }): Promise<Question[]> {
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

  async getHomework(instructorId: string, status?: string, search?: string): Promise<HomeworkAssignment[]> {
    try {
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
      for (const grades of subjectMap.values()) {
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
}

export const storage = new DatabaseStorage();
