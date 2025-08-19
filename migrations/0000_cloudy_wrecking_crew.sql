CREATE TYPE "public"."blooms_taxonomy" AS ENUM('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."question_category" AS ENUM('exam', 'homework');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'short_answer', 'essay', 'fill_blank', 'matching', 'ranking', 'drag_drop');--> statement-breakpoint
CREATE TABLE "answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer_text" text,
	"selected_option" varchar,
	"attachment_url" text,
	"link_url" text,
	"score" numeric(5, 2),
	"max_score" numeric(5, 2),
	"feedback" text,
	"graded_at" timestamp,
	"graded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"order" integer NOT NULL,
	"points" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"instructor_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"subject_id" integer NOT NULL,
	"duration" integer NOT NULL,
	"total_points" integer NOT NULL,
	"attempts_allowed" integer DEFAULT 1 NOT NULL,
	"randomize_questions" boolean DEFAULT false NOT NULL,
	"randomize_options" boolean DEFAULT false NOT NULL,
	"show_results_immediately" boolean DEFAULT false NOT NULL,
	"require_password" boolean DEFAULT false NOT NULL,
	"password" varchar,
	"available_from" timestamp,
	"available_until" timestamp,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finalized_grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" varchar NOT NULL,
	"subject_id" integer NOT NULL,
	"final_grade" numeric(5, 2) NOT NULL,
	"assignment_score" numeric(5, 2) NOT NULL,
	"assignment_max_score" numeric(5, 2) NOT NULL,
	"exam_score" numeric(5, 2) NOT NULL,
	"exam_max_score" numeric(5, 2) NOT NULL,
	"assignment_coefficient" numeric(5, 4) NOT NULL,
	"exam_coefficient" numeric(5, 4) NOT NULL,
	"finalized_by" varchar NOT NULL,
	"finalized_at" timestamp DEFAULT now(),
	CONSTRAINT "finalized_grades_student_id_subject_id_unique" UNIQUE("student_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "grade_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer,
	"assignment_coefficient" numeric(5, 4) DEFAULT '0.4000' NOT NULL,
	"exam_coefficient" numeric(5, 4) DEFAULT '0.6000' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homework_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer_text" text,
	"selected_option" varchar,
	"attachment_url" text,
	"link_url" text,
	"score" numeric(5, 2),
	"max_score" numeric(5, 2),
	"feedback" text,
	"graded_at" timestamp,
	"graded_by" varchar
);
--> statement-breakpoint
CREATE TABLE "homework_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"instructor_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"subject_id" integer NOT NULL,
	"due_date" timestamp,
	"attempts_allowed" integer DEFAULT -1 NOT NULL,
	"show_results_immediately" boolean DEFAULT true NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homework_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"homework_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"order" integer NOT NULL,
	"points" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"homework_id" integer NOT NULL,
	"student_id" varchar NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"submitted_at" timestamp,
	"total_score" numeric(5, 2),
	"max_score" numeric(5, 2),
	"status" varchar DEFAULT 'in_progress' NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"progress_data" jsonb,
	"last_saved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"instructor_id" varchar NOT NULL,
	"title" text,
	"question_text" text NOT NULL,
	"question_type" "question_type" NOT NULL,
	"category" "question_category" DEFAULT 'exam' NOT NULL,
	"options" jsonb,
	"correct_answer" text,
	"explanation" text,
	"attachment_url" text,
	"subject_id" integer NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"blooms_taxonomy" "blooms_taxonomy",
	"points" integer DEFAULT 1 NOT NULL,
	"time_limit" integer,
	"version" varchar DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subjects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"student_id" varchar NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"submitted_at" timestamp,
	"time_taken" integer,
	"total_score" numeric(5, 2),
	"max_score" numeric(5, 2),
	"status" varchar DEFAULT 'in_progress' NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"progress_data" jsonb,
	"last_saved_at" timestamp,
	"time_remaining_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'student' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalized_grades" ADD CONSTRAINT "finalized_grades_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_settings" ADD CONSTRAINT "grade_settings_course_id_subjects_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_answers" ADD CONSTRAINT "homework_answers_submission_id_homework_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."homework_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_answers" ADD CONSTRAINT "homework_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_answers" ADD CONSTRAINT "homework_answers_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_questions" ADD CONSTRAINT "homework_questions_homework_id_homework_assignments_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_questions" ADD CONSTRAINT "homework_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_homework_id_homework_assignments_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");