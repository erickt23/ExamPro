import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["instructor", "student"] }).notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Question types enum
export const questionTypeEnum = pgEnum('question_type', ['multiple_choice', 'short_answer', 'essay', 'fill_blank']);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const bloomsTaxonomyEnum = pgEnum('blooms_taxonomy', ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  title: text("title"),
  questionText: text("question_text").notNull(),
  questionType: questionTypeEnum("question_type").notNull(),
  options: jsonb("options"), // For MCQ options
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  difficulty: difficultyEnum("difficulty").notNull(),
  bloomsTaxonomy: bloomsTaxonomyEnum("blooms_taxonomy"),
  points: integer("points").notNull().default(1),
  timeLimit: integer("time_limit"), // in minutes
  version: varchar("version").notNull().default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exams table
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  duration: integer("duration").notNull(), // in minutes
  totalPoints: integer("total_points").notNull(),
  attemptsAllowed: integer("attempts_allowed").notNull().default(1),
  randomizeQuestions: boolean("randomize_questions").notNull().default(false),
  randomizeOptions: boolean("randomize_options").notNull().default(false),
  showResultsImmediately: boolean("show_results_immediately").notNull().default(false),
  requirePassword: boolean("require_password").notNull().default(false),
  password: varchar("password"),
  availableFrom: timestamp("available_from"),
  availableUntil: timestamp("available_until"),
  status: varchar("status", { enum: ["draft", "active", "completed", "scheduled", "archived"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exam Questions junction table
export const examQuestions = pgTable("exam_questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  points: integer("points").notNull(),
});

// Student Submissions table
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  attemptNumber: integer("attempt_number").notNull().default(1),
  startedAt: timestamp("started_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  timeTaken: integer("time_taken"), // in minutes
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  maxScore: decimal("max_score", { precision: 5, scale: 2 }),
  status: varchar("status", { enum: ["in_progress", "submitted", "graded", "pending"] }).notNull().default("in_progress"),
  isLate: boolean("is_late").notNull().default(false),
});

// Student Answers table
export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answerText: text("answer_text"),
  selectedOption: varchar("selected_option"),
  attachmentUrl: text("attachment_url"), // For file uploads
  linkUrl: text("link_url"), // For link submissions
  score: decimal("score", { precision: 5, scale: 2 }),
  maxScore: decimal("max_score", { precision: 5, scale: 2 }),
  feedback: text("feedback"),
  gradedAt: timestamp("graded_at"),
  gradedBy: varchar("graded_by").references(() => users.id),
});

// Relations
export const subjectsRelations = relations(subjects, ({ many }) => ({
  questions: many(questions),
  exams: many(exams),
}));

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  exams: many(exams),
  submissions: many(submissions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  instructor: one(users, {
    fields: [questions.instructorId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [questions.subjectId],
    references: [subjects.id],
  }),
  examQuestions: many(examQuestions),
  answers: many(answers),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  instructor: one(users, {
    fields: [exams.instructorId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [exams.subjectId],
    references: [subjects.id],
  }),
  examQuestions: many(examQuestions),
  submissions: many(submissions),
}));

export const examQuestionsRelations = relations(examQuestions, ({ one }) => ({
  exam: one(exams, {
    fields: [examQuestions.examId],
    references: [exams.id],
  }),
  question: one(questions, {
    fields: [examQuestions.questionId],
    references: [questions.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [submissions.examId],
    references: [exams.id],
  }),
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  submission: one(submissions, {
    fields: [answers.submissionId],
    references: [submissions.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  grader: one(users, {
    fields: [answers.gradedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  availableFrom: z.string().nullable().optional().transform((val) => val ? new Date(val) : undefined),
  availableUntil: z.string().nullable().optional().transform((val) => val ? new Date(val) : undefined),
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  startedAt: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;
export type ExamQuestion = typeof examQuestions.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;
