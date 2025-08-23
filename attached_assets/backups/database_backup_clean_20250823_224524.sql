--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO neondb_owner;

--
-- Name: blooms_taxonomy; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.blooms_taxonomy AS ENUM (
    'remember',
    'understand',
    'apply',
    'analyze',
    'evaluate',
    'create'
);


ALTER TYPE public.blooms_taxonomy OWNER TO neondb_owner;

--
-- Name: difficulty; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.difficulty AS ENUM (
    'easy',
    'medium',
    'hard'
);


ALTER TYPE public.difficulty OWNER TO neondb_owner;

--
-- Name: question_category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.question_category AS ENUM (
    'exam',
    'homework'
);


ALTER TYPE public.question_category OWNER TO neondb_owner;

--
-- Name: question_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.question_type AS ENUM (
    'multiple_choice',
    'short_answer',
    'essay',
    'fill_blank',
    'matching',
    'ranking',
    'drag_drop'
);


ALTER TYPE public.question_type OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: neondb_owner
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: neondb_owner
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: neondb_owner
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: answers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.answers (
    id integer NOT NULL,
    submission_id integer NOT NULL,
    question_id integer NOT NULL,
    answer_text text,
    selected_option character varying,
    score numeric(5,2),
    max_score numeric(5,2),
    feedback text,
    graded_at timestamp without time zone,
    graded_by character varying,
    attachment_url text,
    link_url text
);


ALTER TABLE public.answers OWNER TO neondb_owner;

--
-- Name: answers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.answers_id_seq OWNER TO neondb_owner;

--
-- Name: answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.answers_id_seq OWNED BY public.answers.id;


--
-- Name: exam_questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exam_questions (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    question_id integer NOT NULL,
    "order" integer NOT NULL,
    points integer NOT NULL
);


ALTER TABLE public.exam_questions OWNER TO neondb_owner;

--
-- Name: exam_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.exam_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_questions_id_seq OWNER TO neondb_owner;

--
-- Name: exam_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.exam_questions_id_seq OWNED BY public.exam_questions.id;


--
-- Name: exams; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exams (
    id integer NOT NULL,
    instructor_id character varying NOT NULL,
    title character varying NOT NULL,
    description text,
    duration integer NOT NULL,
    total_points integer NOT NULL,
    attempts_allowed integer DEFAULT 1 NOT NULL,
    randomize_questions boolean DEFAULT false NOT NULL,
    randomize_options boolean DEFAULT false NOT NULL,
    show_results_immediately boolean DEFAULT false NOT NULL,
    require_password boolean DEFAULT false NOT NULL,
    password character varying,
    available_from timestamp without time zone,
    available_until timestamp without time zone,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    subject_id integer NOT NULL
);


ALTER TABLE public.exams OWNER TO neondb_owner;

--
-- Name: exams_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exams_id_seq OWNER TO neondb_owner;

--
-- Name: exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.exams_id_seq OWNED BY public.exams.id;


--
-- Name: finalized_grades; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.finalized_grades (
    id integer NOT NULL,
    student_id character varying NOT NULL,
    subject_id integer NOT NULL,
    final_grade numeric(5,2) NOT NULL,
    assignment_score numeric(5,2) NOT NULL,
    assignment_max_score numeric(5,2) NOT NULL,
    exam_score numeric(5,2) NOT NULL,
    exam_max_score numeric(5,2) NOT NULL,
    assignment_coefficient numeric(5,4) NOT NULL,
    exam_coefficient numeric(5,4) NOT NULL,
    finalized_by character varying NOT NULL,
    finalized_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.finalized_grades OWNER TO neondb_owner;

--
-- Name: finalized_grades_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.finalized_grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.finalized_grades_id_seq OWNER TO neondb_owner;

--
-- Name: finalized_grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.finalized_grades_id_seq OWNED BY public.finalized_grades.id;


--
-- Name: grade_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.grade_settings (
    id integer NOT NULL,
    course_id integer,
    assignment_coefficient numeric(5,4) DEFAULT 0.4000 NOT NULL,
    exam_coefficient numeric(5,4) DEFAULT 0.6000 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.grade_settings OWNER TO neondb_owner;

--
-- Name: grade_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.grade_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grade_settings_id_seq OWNER TO neondb_owner;

--
-- Name: grade_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.grade_settings_id_seq OWNED BY public.grade_settings.id;


--
-- Name: homework_answers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.homework_answers (
    id integer NOT NULL,
    submission_id integer NOT NULL,
    question_id integer NOT NULL,
    answer_text text,
    selected_option character varying,
    attachment_url text,
    link_url text,
    score numeric(5,2),
    max_score numeric(5,2),
    feedback text,
    graded_at timestamp without time zone,
    graded_by character varying
);


ALTER TABLE public.homework_answers OWNER TO neondb_owner;

--
-- Name: homework_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.homework_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homework_answers_id_seq OWNER TO neondb_owner;

--
-- Name: homework_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.homework_answers_id_seq OWNED BY public.homework_answers.id;


--
-- Name: homework_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.homework_assignments (
    id integer NOT NULL,
    instructor_id character varying NOT NULL,
    title character varying NOT NULL,
    description text,
    subject_id integer NOT NULL,
    due_date timestamp without time zone,
    attempts_allowed integer DEFAULT '-1'::integer NOT NULL,
    show_results_immediately boolean DEFAULT true NOT NULL,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.homework_assignments OWNER TO neondb_owner;

--
-- Name: homework_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.homework_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homework_assignments_id_seq OWNER TO neondb_owner;

--
-- Name: homework_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.homework_assignments_id_seq OWNED BY public.homework_assignments.id;


--
-- Name: homework_questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.homework_questions (
    id integer NOT NULL,
    homework_id integer NOT NULL,
    question_id integer NOT NULL,
    "order" integer NOT NULL,
    points integer NOT NULL
);


ALTER TABLE public.homework_questions OWNER TO neondb_owner;

--
-- Name: homework_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.homework_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homework_questions_id_seq OWNER TO neondb_owner;

--
-- Name: homework_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.homework_questions_id_seq OWNED BY public.homework_questions.id;


--
-- Name: homework_submissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.homework_submissions (
    id integer NOT NULL,
    homework_id integer NOT NULL,
    student_id character varying NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    started_at timestamp without time zone DEFAULT now(),
    submitted_at timestamp without time zone,
    total_score numeric(5,2),
    max_score numeric(5,2),
    status character varying DEFAULT 'in_progress'::character varying NOT NULL,
    is_late boolean DEFAULT false NOT NULL,
    progress_data jsonb,
    last_saved_at timestamp without time zone
);


ALTER TABLE public.homework_submissions OWNER TO neondb_owner;

--
-- Name: homework_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.homework_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homework_submissions_id_seq OWNER TO neondb_owner;

--
-- Name: homework_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.homework_submissions_id_seq OWNED BY public.homework_submissions.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    instructor_id character varying NOT NULL,
    title text,
    question_text text NOT NULL,
    question_type public.question_type NOT NULL,
    options jsonb,
    correct_answer text,
    explanation text,
    difficulty public.difficulty NOT NULL,
    blooms_taxonomy public.blooms_taxonomy,
    points integer DEFAULT 1 NOT NULL,
    time_limit integer,
    version character varying DEFAULT '1.0'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    subject_id integer NOT NULL,
    attachment_url text,
    category public.question_category DEFAULT 'exam'::public.question_category NOT NULL
);


ALTER TABLE public.questions OWNER TO neondb_owner;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO neondb_owner;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.subjects OWNER TO neondb_owner;

--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subjects_id_seq OWNER TO neondb_owner;

--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.submissions (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    student_id character varying NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    started_at timestamp without time zone DEFAULT now(),
    submitted_at timestamp without time zone,
    time_taken integer,
    total_score numeric(5,2),
    max_score numeric(5,2),
    status character varying DEFAULT 'in_progress'::character varying NOT NULL,
    is_late boolean DEFAULT false NOT NULL,
    progress_data jsonb,
    last_saved_at timestamp without time zone,
    time_remaining_seconds integer,
    is_highest_score boolean DEFAULT false NOT NULL
);


ALTER TABLE public.submissions OWNER TO neondb_owner;

--
-- Name: submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.submissions_id_seq OWNER TO neondb_owner;

--
-- Name: submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.submissions_id_seq OWNED BY public.submissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying DEFAULT 'student'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    password text
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: exam_questions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_questions ALTER COLUMN id SET DEFAULT nextval('public.exam_questions_id_seq'::regclass);


--
-- Name: exams id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exams ALTER COLUMN id SET DEFAULT nextval('public.exams_id_seq'::regclass);


--
-- Name: finalized_grades id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.finalized_grades ALTER COLUMN id SET DEFAULT nextval('public.finalized_grades_id_seq'::regclass);


--
-- Name: grade_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.grade_settings ALTER COLUMN id SET DEFAULT nextval('public.grade_settings_id_seq'::regclass);


--
-- Name: homework_answers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_answers ALTER COLUMN id SET DEFAULT nextval('public.homework_answers_id_seq'::regclass);


--
-- Name: homework_assignments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_assignments ALTER COLUMN id SET DEFAULT nextval('public.homework_assignments_id_seq'::regclass);


--
-- Name: homework_questions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_questions ALTER COLUMN id SET DEFAULT nextval('public.homework_questions_id_seq'::regclass);


--
-- Name: homework_submissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_submissions ALTER COLUMN id SET DEFAULT nextval('public.homework_submissions_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: submissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.submissions ALTER COLUMN id SET DEFAULT nextval('public.submissions_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: neondb_owner
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: answers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.answers (id, submission_id, question_id, answer_text, selected_option, score, max_score, feedback, graded_at, graded_by, attachment_url, link_url) FROM stdin;
\.


--
-- Data for Name: exam_questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.exam_questions (id, exam_id, question_id, "order", points) FROM stdin;
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.exams (id, instructor_id, title, description, duration, total_points, attempts_allowed, randomize_questions, randomize_options, show_results_immediately, require_password, password, available_from, available_until, status, created_at, updated_at, subject_id) FROM stdin;
\.


--
-- Data for Name: finalized_grades; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.finalized_grades (id, student_id, subject_id, final_grade, assignment_score, assignment_max_score, exam_score, exam_max_score, assignment_coefficient, exam_coefficient, finalized_by, finalized_at) FROM stdin;
\.


--
-- Data for Name: grade_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.grade_settings (id, course_id, assignment_coefficient, exam_coefficient, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: homework_answers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_answers (id, submission_id, question_id, answer_text, selected_option, attachment_url, link_url, score, max_score, feedback, graded_at, graded_by) FROM stdin;
\.


--
-- Data for Name: homework_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_assignments (id, instructor_id, title, description, subject_id, due_date, attempts_allowed, show_results_immediately, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: homework_questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_questions (id, homework_id, question_id, "order", points) FROM stdin;
\.


--
-- Data for Name: homework_submissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_submissions (id, homework_id, student_id, attempt_number, started_at, submitted_at, total_score, max_score, status, is_late, progress_data, last_saved_at) FROM stdin;
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questions (id, instructor_id, title, question_text, question_type, options, correct_answer, explanation, difficulty, blooms_taxonomy, points, time_limit, version, is_active, usage_count, created_at, updated_at, subject_id, attachment_url, category) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
erBNsffdla0u4As5JaS6ZjQApiEgY3G1	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T21:51:58.940Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755989518, "iat": 1755985918, "iss": "https://replit.com/oidc", "sub": "44994161", "email": "admin@kaliteksolutions.com", "at_hash": "mvIEpYMfsTFwtOMJ6kyxHA", "username": "admin3598", "auth_time": 1755563602, "last_name": "Kalitek", "first_name": "Admin"}, "expires_at": 1755989518, "access_token": "HLPJ6Z5Af23fDn2uFPM7fxgxKKPmJ7SMyuuqCfQd-1y", "refresh_token": "JecXX87M9E0u7bsmV6jrgD6PtOpIu8-VNcR0cwjvkpb"}}}	2025-08-30 22:43:27
jZCcP9yAbWOJ-b8qCBTpfiajtRrYNK0E	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T22:40:46.082Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755992445, "iat": 1755988845, "iss": "https://replit.com/oidc", "sub": "46783927", "email": "metminwi@gmail.com", "at_hash": "PEv156TTMTf1XVSM1v2Jeg", "username": "metminwi1", "auth_time": 1755988845, "last_name": null, "first_name": null}, "expires_at": 1755992445, "access_token": "8TJ-bKq6gH0da1oIJyJHW4aIc1DZJ_NmkhNKkPWZDyi", "refresh_token": "U1XPHFfZYkU12QxDqh0yq7beRAUP2wD7tnA6-UJHuVV"}}}	2025-08-30 22:45:14
rpmfhQrYyv-4uwJLDgMsu6Rw9yQcMZgC	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T22:38:29.200Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755992309, "iat": 1755988709, "iss": "https://replit.com/oidc", "sub": "43280843", "email": "erick.toussaint23@gmail.com", "at_hash": "arN4D6TwpTsQ5nRaLY7F9w", "username": "erickt23", "auth_time": 1755656485, "last_name": "Toussaint", "first_name": "Erick", "profile_image_url": "https://storage.googleapis.com/replit/images/1751394562545_25781840c7f87620729093198a607f40.jpeg"}, "expires_at": 1755992309, "access_token": "hrT0vu7NR--h8uT8jGgBQRR413BDvFfAzJRgKzjcppz", "refresh_token": "LGAWK4Zaa8E7oqbrG8n_Zv6hqrgG5Kr5TbH8r98TiGZ"}}}	2025-08-30 22:45:14
TVttGrDG2mypLDtl6kSZvvJOh_a3dpxZ	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T21:50:11.544Z", "httpOnly": true, "originalMaxAge": 604799999}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755989411, "iat": 1755985811, "iss": "https://replit.com/oidc", "sub": "43280843", "email": "erick.toussaint23@gmail.com", "at_hash": "Vzvg1jvOT8Rb6OskMsYs2Q", "username": "erickt23", "auth_time": 1755985811, "last_name": "Toussaint", "first_name": "Erick", "profile_image_url": "https://storage.googleapis.com/replit/images/1751394562545_25781840c7f87620729093198a607f40.jpeg"}, "expires_at": 1755989411, "access_token": "kXjMLnNTxsdNhq565wPocdR66nsd6fTrxv7iZXUCP2G", "refresh_token": "1Lw5LoshbK94gRiiFY7q6QB42higgBGHbAzEwg-pzyM"}}}	2025-08-30 21:51:51
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subjects (id, name, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.submissions (id, exam_id, student_id, attempt_number, started_at, submitted_at, time_taken, total_score, max_score, status, is_late, progress_data, last_saved_at, time_remaining_seconds, is_highest_score) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, profile_image_url, role, created_at, updated_at, password) FROM stdin;
student2	student2@example.com	Student	Two	\N	student	2025-08-04 01:42:22.108749	2025-08-04 01:42:22.108749	\N
student3	student3@example.com	Student	Three	\N	student	2025-08-04 01:42:22.108749	2025-08-04 01:42:22.108749	\N
teacher1	teacher1@example.com	Teacher	One	\N	instructor	2025-08-12 15:00:13.935807	2025-08-12 15:00:13.935807	$2b$10$YocokyBUzubAzJPnqeUjE.FwjPz5OzqZnPAvFo9aDhN5Aeami99va
student1	student1@example.com	Student	One	\N	student	2025-08-04 01:42:22.108749	2025-08-12 15:00:14.842	$2b$10$YocokyBUzubAzJPnqeUjE.FwjPz5OzqZnPAvFo9aDhN5Aeami99va
44994161	admin@kaliteksolutions.com	Admin	Kalitek	\N	instructor	2025-07-20 21:39:21.253346	2025-08-19 00:33:23.191	\N
43280843	erick.toussaint23@gmail.com	Erick	Toussaint	https://storage.googleapis.com/replit/images/1751394562545_25781840c7f87620729093198a607f40.jpeg	student	2025-07-20 21:39:27.253358	2025-08-23 21:50:11.47	\N
46783927	metminwi@gmail.com	\N	\N	\N	student	2025-08-23 02:21:35.994725	2025-08-23 22:40:45.929	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: neondb_owner
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.answers_id_seq', 93, true);


--
-- Name: exam_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.exam_questions_id_seq', 113, true);


--
-- Name: exams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.exams_id_seq', 30, true);


--
-- Name: finalized_grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.finalized_grades_id_seq', 1, true);


--
-- Name: grade_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.grade_settings_id_seq', 3, true);


--
-- Name: homework_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.homework_answers_id_seq', 11, true);


--
-- Name: homework_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.homework_assignments_id_seq', 6, true);


--
-- Name: homework_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.homework_questions_id_seq', 13, true);


--
-- Name: homework_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.homework_submissions_id_seq', 4, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questions_id_seq', 89, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.subjects_id_seq', 19, true);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.submissions_id_seq', 45, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: exam_questions exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: finalized_grades finalized_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.finalized_grades
    ADD CONSTRAINT finalized_grades_pkey PRIMARY KEY (id);


--
-- Name: finalized_grades finalized_grades_student_id_subject_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.finalized_grades
    ADD CONSTRAINT finalized_grades_student_id_subject_id_unique UNIQUE (student_id, subject_id);


--
-- Name: grade_settings grade_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.grade_settings
    ADD CONSTRAINT grade_settings_pkey PRIMARY KEY (id);


--
-- Name: homework_answers homework_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_answers
    ADD CONSTRAINT homework_answers_pkey PRIMARY KEY (id);


--
-- Name: homework_assignments homework_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_assignments
    ADD CONSTRAINT homework_assignments_pkey PRIMARY KEY (id);


--
-- Name: homework_questions homework_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_questions
    ADD CONSTRAINT homework_questions_pkey PRIMARY KEY (id);


--
-- Name: homework_submissions homework_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: subjects subjects_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_name_unique UNIQUE (name);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_submissions_highest_score; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_submissions_highest_score ON public.submissions USING btree (exam_id, student_id, is_highest_score) WHERE (is_highest_score = true);


--
-- Name: answers answers_graded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_graded_by_users_id_fk FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: answers answers_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: answers answers_submission_id_submissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_submission_id_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: exam_questions exam_questions_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_questions exam_questions_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: exams exams_instructor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_instructor_id_users_id_fk FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: exams exams_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: finalized_grades finalized_grades_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.finalized_grades
    ADD CONSTRAINT finalized_grades_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: grade_settings grade_settings_course_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.grade_settings
    ADD CONSTRAINT grade_settings_course_id_subjects_id_fk FOREIGN KEY (course_id) REFERENCES public.subjects(id);


--
-- Name: homework_answers homework_answers_graded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_answers
    ADD CONSTRAINT homework_answers_graded_by_users_id_fk FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: homework_answers homework_answers_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_answers
    ADD CONSTRAINT homework_answers_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: homework_answers homework_answers_submission_id_homework_submissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_answers
    ADD CONSTRAINT homework_answers_submission_id_homework_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES public.homework_submissions(id) ON DELETE CASCADE;


--
-- Name: homework_assignments homework_assignments_instructor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_assignments
    ADD CONSTRAINT homework_assignments_instructor_id_users_id_fk FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: homework_assignments homework_assignments_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_assignments
    ADD CONSTRAINT homework_assignments_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: homework_questions homework_questions_homework_id_homework_assignments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_questions
    ADD CONSTRAINT homework_questions_homework_id_homework_assignments_id_fk FOREIGN KEY (homework_id) REFERENCES public.homework_assignments(id) ON DELETE CASCADE;


--
-- Name: homework_questions homework_questions_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_questions
    ADD CONSTRAINT homework_questions_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: homework_submissions homework_submissions_homework_id_homework_assignments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_homework_id_homework_assignments_id_fk FOREIGN KEY (homework_id) REFERENCES public.homework_assignments(id);


--
-- Name: homework_submissions homework_submissions_student_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_student_id_users_id_fk FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: questions questions_instructor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_instructor_id_users_id_fk FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: questions questions_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: submissions submissions_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id);


--
-- Name: submissions submissions_student_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_student_id_users_id_fk FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

