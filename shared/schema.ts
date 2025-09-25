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
  pgEnum,
  unique
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
  role: varchar("role", { enum: ["instructor", "student", "admin"] }).notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Question types enum
export const questionTypeEnum = pgEnum('question_type', ['multiple_choice', 'short_answer', 'essay', 'fill_blank', 'matching', 'ranking', 'drag_drop']);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const bloomsTaxonomyEnum = pgEnum('blooms_taxonomy', ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
export const questionCategoryEnum = pgEnum('question_category', ['exam', 'homework']);
export const gradeLevelEnum = pgEnum('grade_level', ['pre_k', 'kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'undergraduate', 'graduate']);

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grade Settings table
export const gradeSettings = pgTable("grade_settings", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => subjects.id), // null means global settings
  assignmentCoefficient: decimal("assignment_coefficient", { precision: 5, scale: 4 }).notNull().default("0.4000"),
  examCoefficient: decimal("exam_coefficient", { precision: 5, scale: 4 }).notNull().default("0.6000"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Final grades table - stores finalized grades that are immune to coefficient changes
export const finalizedGrades = pgTable("finalized_grades", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  finalGrade: decimal("final_grade", { precision: 5, scale: 2 }).notNull(),
  assignmentScore: decimal("assignment_score", { precision: 5, scale: 2 }).notNull(),
  assignmentMaxScore: decimal("assignment_max_score", { precision: 5, scale: 2 }).notNull(),
  examScore: decimal("exam_score", { precision: 5, scale: 2 }).notNull(),
  examMaxScore: decimal("exam_max_score", { precision: 5, scale: 2 }).notNull(),
  assignmentCoefficient: decimal("assignment_coefficient", { precision: 5, scale: 4 }).notNull(),
  examCoefficient: decimal("exam_coefficient", { precision: 5, scale: 4 }).notNull(),
  finalizedBy: varchar("finalized_by").notNull(),
  finalizedAt: timestamp("finalized_at").defaultNow(),
}, (table) => ({
  uniqueStudentSubject: unique().on(table.studentId, table.subjectId),
}));

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  title: text("title"),
  questionText: text("question_text").notNull(),
  questionType: questionTypeEnum("question_type").notNull(),
  category: questionCategoryEnum("category").notNull().default('exam'), // NEW: Separate homework from exam questions
  options: jsonb("options"), // For MCQ options
  correctAnswer: text("correct_answer"),
  correctAnswers: jsonb("correct_answers"), // For multiple correct answers in MCQ
  explanation: text("explanation"),
  attachmentUrl: text("attachment_url"), // For instructor file attachments
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  difficulty: difficultyEnum("difficulty").notNull(),
  bloomsTaxonomy: bloomsTaxonomyEnum("blooms_taxonomy"),
  gradeLevel: gradeLevelEnum("grade_level"),
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
  gradeLevel: gradeLevelEnum("grade_level"),
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
  // Proctoring configuration
  enableProctoring: boolean("enable_proctoring").notNull().default(false),
  proctoringWarningThreshold: integer("proctoring_warning_threshold").notNull().default(2),
  proctoringAutoTerminate: boolean("proctoring_auto_terminate").notNull().default(true),
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
  isHighestScore: boolean("is_highest_score").notNull().default(false), // Track which attempt has the highest score
  // Progress saving fields
  progressData: jsonb("progress_data"), // Stores answers, current question, time remaining, etc.
  lastSavedAt: timestamp("last_saved_at"),
  timeRemainingSeconds: integer("time_remaining_seconds"), // Track remaining time for resuming
  // Proctoring data
  proctoringData: jsonb("proctoring_data"), // Stores violation logs, timestamps, and proctoring metadata
});

// Student Answers table
export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answerText: text("answer_text"),
  selectedOption: varchar("selected_option"),
  selectedOptions: jsonb("selected_options"), // For multiple selected options in MCQ
  attachmentUrl: text("attachment_url"), // For file uploads
  linkUrl: text("link_url"), // For link submissions
  score: decimal("score", { precision: 5, scale: 2 }),
  maxScore: decimal("max_score", { precision: 5, scale: 2 }),
  feedback: text("feedback"),
  gradedAt: timestamp("graded_at"),
  gradedBy: varchar("graded_by").references(() => users.id),
});

// Homework Assignments table
export const homeworkAssignments = pgTable("homework_assignments", {
  id: serial("id").primaryKey(),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  dueDate: timestamp("due_date"),
  attemptsAllowed: integer("attempts_allowed").notNull().default(-1), // -1 for unlimited
  showResultsImmediately: boolean("show_results_immediately").notNull().default(true),
  status: varchar("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Homework Questions junction table
export const homeworkQuestions = pgTable("homework_questions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").notNull().references(() => homeworkAssignments.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  points: integer("points").notNull(),
});

// Homework Submissions table
export const homeworkSubmissions = pgTable("homework_submissions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").notNull().references(() => homeworkAssignments.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  attemptNumber: integer("attempt_number").notNull().default(1),
  startedAt: timestamp("started_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  maxScore: decimal("max_score", { precision: 5, scale: 2 }),
  status: varchar("status", { enum: ["in_progress", "submitted", "graded", "pending"] }).notNull().default("in_progress"),
  isLate: boolean("is_late").notNull().default(false),
  // Progress saving fields
  progressData: jsonb("progress_data"), // Stores answers, current question, etc.
  lastSavedAt: timestamp("last_saved_at"),
});

// Homework Answers table
export const homeworkAnswers = pgTable("homework_answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => homeworkSubmissions.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answerText: text("answer_text"),
  selectedOption: varchar("selected_option"),
  selectedOptions: jsonb("selected_options"), // For multiple selected options in MCQ
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
  homeworkAssignments: many(homeworkAssignments),
}));

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  exams: many(exams),
  submissions: many(submissions),
  homeworkAssignments: many(homeworkAssignments),
  homeworkSubmissions: many(homeworkSubmissions),
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
  homeworkQuestions: many(homeworkQuestions),
  answers: many(answers),
  homeworkAnswers: many(homeworkAnswers),
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

// Homework Relations
export const homeworkAssignmentsRelations = relations(homeworkAssignments, ({ one, many }) => ({
  instructor: one(users, {
    fields: [homeworkAssignments.instructorId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [homeworkAssignments.subjectId],
    references: [subjects.id],
  }),
  homeworkQuestions: many(homeworkQuestions),
  homeworkSubmissions: many(homeworkSubmissions),
}));

export const homeworkQuestionsRelations = relations(homeworkQuestions, ({ one }) => ({
  homework: one(homeworkAssignments, {
    fields: [homeworkQuestions.homeworkId],
    references: [homeworkAssignments.id],
  }),
  question: one(questions, {
    fields: [homeworkQuestions.questionId],
    references: [questions.id],
  }),
}));

export const homeworkSubmissionsRelations = relations(homeworkSubmissions, ({ one, many }) => ({
  homework: one(homeworkAssignments, {
    fields: [homeworkSubmissions.homeworkId],
    references: [homeworkAssignments.id],
  }),
  student: one(users, {
    fields: [homeworkSubmissions.studentId],
    references: [users.id],
  }),
  answers: many(homeworkAnswers),
}));

export const homeworkAnswersRelations = relations(homeworkAnswers, ({ one }) => ({
  submission: one(homeworkSubmissions, {
    fields: [homeworkAnswers.submissionId],
    references: [homeworkSubmissions.id],
  }),
  question: one(questions, {
    fields: [homeworkAnswers.questionId],
    references: [questions.id],
  }),
  grader: one(users, {
    fields: [homeworkAnswers.gradedBy],
    references: [users.id],
  }),
}));

export const gradeSettingsRelations = relations(gradeSettings, ({ one }) => ({
  course: one(subjects, {
    fields: [gradeSettings.courseId],
    references: [subjects.id],
  }),
}));

export const finalizedGradesRelations = relations(finalizedGrades, ({ one }) => ({
  student: one(users, {
    fields: [finalizedGrades.studentId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [finalizedGrades.subjectId],
    references: [subjects.id],
  }),
  finalizer: one(users, {
    fields: [finalizedGrades.finalizedBy],
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

export const insertHomeworkAssignmentSchema = createInsertSchema(homeworkAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : undefined),
});

export const insertHomeworkSubmissionSchema = createInsertSchema(homeworkSubmissions).omit({
  id: true,
  startedAt: true,
});

export const insertHomeworkAnswerSchema = createInsertSchema(homeworkAnswers).omit({
  id: true,
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

export const insertGradeSettingsSchema = createInsertSchema(gradeSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinalizedGradeSchema = createInsertSchema(finalizedGrades).omit({
  id: true,
  finalizedAt: true,
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
export type InsertHomeworkAssignment = z.infer<typeof insertHomeworkAssignmentSchema>;
export type HomeworkAssignment = typeof homeworkAssignments.$inferSelect;
export type HomeworkQuestion = typeof homeworkQuestions.$inferSelect;
export type HomeworkSubmission = typeof homeworkSubmissions.$inferSelect;
export type HomeworkAnswer = typeof homeworkAnswers.$inferSelect;
export type InsertGradeSettings = z.infer<typeof insertGradeSettingsSchema>;
export type GradeSettings = typeof gradeSettings.$inferSelect;
export type InsertFinalizedGrade = z.infer<typeof insertFinalizedGradeSchema>;
export type FinalizedGrade = typeof finalizedGrades.$inferSelect;
