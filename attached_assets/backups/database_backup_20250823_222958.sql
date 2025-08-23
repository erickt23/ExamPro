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
1	1	2		A	1.00	1.00	\N	\N	\N	\N	\N
2	1	1		B	1.00	1.00	\N	\N	\N	\N	\N
3	3	9	Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.	\N	0.00	1.00	\N	\N	\N	\N	\N
4	3	9	Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.	\N	0.00	1.00	\N	\N	\N	\N	\N
5	3	8		B	1.00	1.00	\N	\N	\N	\N	\N
6	3	3		B	1.00	1.00	\N	\N	\N	\N	\N
7	3	2		A	1.00	1.00	\N	\N	\N	\N	\N
8	3	4		C	1.00	1.00	\N	\N	\N	\N	\N
9	3	5		C	1.00	1.00	\N	\N	\N	\N	\N
11	3	7	Mona Lisa	\N	0.00	1.00	\N	\N	\N	\N	\N
13	4	8		B	1.00	1.00	\N	\N	\N	\N	\N
14	4	3		C	0.00	1.00	\N	\N	\N	\N	\N
15	4	2		A	1.00	1.00	\N	\N	\N	\N	\N
16	4	5		B	0.00	1.00	\N	\N	\N	\N	\N
17	4	4		C	1.00	1.00	\N	\N	\N	\N	\N
12	4	9	\nLorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.	\N	1.00	1.00	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	2025-08-03 04:43:35.502	44994161	\N	\N
18	5	8		B	1.00	1.00	\N	\N	\N	\N	\N
19	5	9	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	\N	0.00	1.00	\N	\N	\N	\N	\N
20	5	7	Mona Lisa	\N	0.00	1.00	\N	\N	\N	\N	\N
21	5	4		C	1.00	1.00	\N	\N	\N	\N	\N
22	5	3		B	1.00	1.00	\N	\N	\N	\N	\N
23	6	9	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	\N	0.00	1.00	\N	\N	\N	\N	\N
24	6	8		B	1.00	1.00	\N	\N	\N	\N	\N
25	6	5		C	1.00	1.00	\N	\N	\N	\N	\N
26	6	4		C	1.00	1.00	\N	\N	\N	\N	\N
27	6	2		A	1.00	1.00	\N	\N	\N	\N	\N
28	6	3		B	1.00	1.00	\N	\N	\N	\N	\N
29	9	9		\N	1.00	1.00		2025-08-03 20:15:55.548	44994161	https://storage.googleapis.com/replit-objstore-f5818c87-82a2-4b00-ae18-5dfcaa5e5530/.private/uploads/a05fdbbc-628c-437b-ba37-4d4fc0ee4b9e	\N
30	10	16		\N	0.00	10.00	\N	\N	\N	\N	\N
31	11	17	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	\N	0.00	10.00	\N	\N	\N	\N	\N
32	11	16	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	\N	0.00	10.00	\N	\N	\N	\N	\N
33	12	8		B	1.00	1.00	\N	\N	\N	\N	\N
34	13	14	sfhsd	\N	0.50	1.00		2025-08-03 22:02:27.288	44994161	\N	\N
35	14	4		C	1.00	1.00	\N	\N	\N	\N	\N
36	15	8		B	1.00	1.00	\N	\N	\N	\N	\N
37	15	5		C	1.00	1.00	\N	\N	\N	\N	\N
38	16	8		B	1.00	1.00	\N	\N	\N	\N	\N
39	16	5		C	1.00	1.00	\N	\N	\N	\N	\N
40	18	8		B	1.00	1.00	\N	\N	\N	\N	\N
41	18	5		C	1.00	1.00	\N	\N	\N	\N	\N
42	20	29	B	\N	0.00	4.00	\N	\N	\N	\N	\N
43	20	31	B	\N	0.00	6.00	\N	\N	\N	\N	\N
44	20	34	Lorem Ipsum	\N	0.00	3.00	\N	\N	\N	\N	\N
45	20	53	Lorem Ipsum	\N	0.00	5.00	\N	\N	\N	\N	\N
46	20	54	Lorem Ipsum	\N	0.00	6.00	\N	\N	\N	\N	\N
47	20	55	Lorem Ipsum	\N	0.00	10.00	\N	\N	\N	\N	\N
48	20	56	Lorem Ipsum	\N	0.00	12.00	\N	\N	\N	\N	\N
49	22	32	A	\N	0.00	10.00	\N	\N	\N	\N	\N
50	22	33	B	\N	0.00	10.00	\N	\N	\N	\N	\N
51	22	51	B	\N	0.00	5.00	\N	\N	\N	\N	\N
53	24	59		\N	0.00	4.00	\N	\N	\N	\N	\N
54	24	60		\N	0.00	4.00	\N	\N	\N	\N	\N
58	26	58	["Isabella","Espagne"]	\N	2.00	2.00		2025-08-22 19:50:46.131	44994161	\N	\N
56	25	59		\N	0.00	4.00	\N	\N	\N	\N	\N
57	25	60		\N	0.00	4.00	\N	\N	\N	\N	\N
55	25	58	["Isabella","Espagne"]	\N	2.00	2.00		2025-08-22 19:51:50.809	44994161	\N	\N
59	26	59		\N	3.00	4.00	\N	\N	\N	\N	\N
60	26	60		\N	2.00	4.00	\N	\N	\N	\N	\N
62	27	59		\N	0.00	3.00	\N	\N	\N	\N	\N
63	27	60		\N	0.00	4.00	\N	\N	\N	\N	\N
64	28	58	["Lorem","Ipsum"]	\N	1.50	2.00		2025-08-22 19:54:47.498	44994161	\N	\N
66	30	58	["Isabella","Italie"]	\N	1.00	2.00		2025-08-22 21:33:56.517	44994161	\N	\N
67	31	58	["Isabella","Espagne"]	\N	2.00	2.00		2025-08-22 21:35:38.999	44994161	\N	\N
65	29	58	["Isabella","Espagne"]	\N	\N	2.00		2025-08-22 19:33:08.391	44994161	\N	\N
10	3	6	China	\N	\N	1.00	\N	\N	\N	\N	\N
52	24	58	["Isabella","Espagne"]	\N	\N	2.00	test feedback caonabo	2025-08-22 02:39:14.538	44994161	\N	\N
68	33	59	{"0":"Pawol","1":"Bonjour","2":"Wrong"}	\N	2.00	3.00	\N	\N	\N	\N	\N
61	27	58	["Lorem","Ipsum"]	\N	\N	2.00	\N	\N	\N	\N	\N
69	34	61	{}	\N	0.00	5.00	\N	\N	\N	\N	\N
70	35	61	{"0":"Couleur","1":"Canine","2":"Wrong","3":"Voiture","4":"Football"}	\N	4.00	5.00	\N	\N	\N	\N	\N
71	36	61	{"0":"Couleur","1":"Canine","2":"Ecole","3":"Voiture","4":"Football"}	\N	5.00	5.00	\N	\N	\N	\N	\N
72	38	47	{"0":"Requin","1":"Terre"}	\N	2.00	2.00	\N	\N	\N	\N	\N
73	38	59	{"0":"Pawol","1":"Bonjour","2":"Lajounen"}	\N	3.00	3.00	\N	\N	\N	\N	\N
74	38	61	{"0":"Couleur","1":"Canine","2":"Ecole","3":"Voiture","4":"Football"}	\N	5.00	5.00	\N	\N	\N	\N	\N
75	39	47	{"0":"Requin","1":"Terre"}	\N	2.00	2.00	\N	\N	\N	\N	\N
76	39	59	{"0":"Pawol","1":"Bonjour","2":"Lajounen"}	\N	3.00	3.00	\N	\N	\N	\N	\N
77	39	61	{"0":"Couleur","1":"Canine","2":"Ecole","3":"Voiture","4":"Football"}	\N	5.00	5.00	\N	\N	\N	\N	\N
78	40	47	{"0":"Requin","1":"Terre"}	\N	2.00	2.00	\N	\N	\N	\N	\N
79	40	59	{"0":"Pawol","1":"Bonjour","2":"Lajounen"}	\N	3.00	3.00	\N	\N	\N	\N	\N
80	40	61	{"0":"Couleur","1":"Canine","2":"Ecole","3":"Voiture","4":"Football"}	\N	5.00	5.00	\N	\N	\N	\N	\N
83	42	49	D	D	4.00	4.00	\N	\N	\N	\N	\N
84	42	50	B	B	6.00	6.00	\N	\N	\N	\N	\N
85	42	51	B	B	5.00	5.00	\N	\N	\N	\N	\N
82	42	14	Australia	Australia	1.00	1.00		2025-08-23 02:02:21.731	44994161	\N	\N
86	42	55	Le marbre de Thorigny est le socle en grès d'une statue découvert à Vieux (et non à Thorigny), dans le département normand du Calvados. Les inscriptions qui y sont gravées expliquent la carrière politique d'un haut personnage gallo-romain, Titus Sennius Sollemnis, « un des rares notables connus dans la partie armoricaine de la Gaule Lyonnaise » selon Pascal Vipard. La décision d'édifier le monument a été prise par les membres du Conseil des Gaules, à Lugdunum.\n\nCette pierre, découverte selon une tradition mal étayée en 1580, mais plus vraisemblablement au XVIIe siècle, est le principal document épigraphique de Normandie. Le monument transporté dans le département actuel de la Manche est conservé dans le château des Matignon puis à Saint-Lô où il est gravement endommagé lors des bombardements qui détruisent la ville en 1944. Transporté à l'université de Caen dans les années 1950, il retourne à Saint-Lô à la fin des années 1980.	Le marbre de Thorigny est le socle en grès d'une statue découvert à Vieux (et non à Thorigny), dans le département normand du Calvados. Les inscriptions qui y sont gravées expliquent la carrière politique d'un haut personnage gallo-romain, Titus Sennius Sollemnis, « un des rares notables connus dans la partie armoricaine de la Gaule Lyonnaise » selon Pascal Vipard. La décision d'édifier le monument a été prise par les membres du Conseil des Gaules, à Lugdunum.\n\nCette pierre, découverte selon une tradition mal étayée en 1580, mais plus vraisemblablement au XVIIe siècle, est le principal document épigraphique de Normandie. Le monument transporté dans le département actuel de la Manche est conservé dans le château des Matignon puis à Saint-Lô où il est gravement endommagé lors des bombardements qui détruisent la ville en 1944. Transporté à l'université de Caen dans les années 1950, il retourne à Saint-Lô à la fin des années 1980.	8.00	10.00		2025-08-23 02:02:23.14	44994161	\N	\N
81	42	6	["China"]	\N	1.00	1.00		2025-08-23 02:02:24.767	44994161	\N	\N
87	44	6	["China"]	\N	0.00	1.00	\N	\N	\N	\N	\N
88	44	14	Australia	Australia	0.00	1.00	\N	\N	\N	\N	\N
89	44	49	A	A	0.00	4.00	\N	\N	\N	\N	\N
90	44	50	C	C	0.00	6.00	\N	\N	\N	\N	\N
91	44	51	B	B	5.00	5.00	\N	\N	\N	\N	\N
92	44	55	Voici un ensemble de 35 questions d’examen (en français) fondées sur le contenu du module 5 « Gestion et traitement des archives courantes et intermédiaires » (avec compléments des modules liés). J’ai réparti les questions selon les types demandés (QCM, réponse courte, essai, « fill-in-the-blank », appariement, classement, glisser-déposer), trois niveaux de difficulté (facile, moyen, difficile), en lien avec la taxonomie de Bloom (se souvenir, comprendre, appliquer, analyser). Le total est de 100 points, chaque question précise sa valeur.	Voici un ensemble de 35 questions d’examen (en français) fondées sur le contenu du module 5 « Gestion et traitement des archives courantes et intermédiaires » (avec compléments des modules liés). J’ai réparti les questions selon les types demandés (QCM, réponse courte, essai, « fill-in-the-blank », appariement, classement, glisser-déposer), trois niveaux de difficulté (facile, moyen, difficile), en lien avec la taxonomie de Bloom (se souvenir, comprendre, appliquer, analyser). Le total est de 100 points, chaque question précise sa valeur.	0.00	10.00	\N	\N	\N	\N	\N
93	45	58	["Isabella","Espagne"]	\N	0.00	2.00	\N	\N	\N	\N	\N
\.


--
-- Data for Name: exam_questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.exam_questions (id, exam_id, question_id, "order", points) FROM stdin;
1	1	2	1	1
19	3	9	1	1
20	3	8	1	1
21	3	3	1	1
22	3	2	1	1
23	3	3	1	1
24	3	3	1	1
25	3	9	1	1
26	3	9	1	1
27	3	8	1	1
28	3	9	1	1
29	3	9	1	1
30	3	5	1	1
31	4	9	1	1
32	4	8	2	1
33	4	3	3	1
34	4	2	4	1
35	4	4	5	1
36	4	5	6	1
37	4	6	7	1
38	4	7	8	1
39	4	9	1	1
40	1	9	3	1
41	1	8	4	1
42	1	3	5	1
43	1	6	6	1
44	1	7	7	1
45	5	9	1	1
46	5	8	2	1
47	5	3	3	1
48	5	2	4	1
49	5	5	5	1
50	5	4	6	1
51	6	8	1	1
52	6	9	2	1
53	6	7	3	1
54	6	4	4	1
55	6	3	5	1
56	7	9	1	1
57	7	8	2	1
58	7	5	3	1
59	7	4	4	1
60	7	2	5	1
61	7	3	6	1
62	8	9	1	1
63	9	9	1	1
64	10	16	1	10
65	11	17	1	10
66	11	16	2	10
67	12	8	1	1
68	13	8	1	1
69	14	8	1	1
70	15	3	1	1
71	16	14	1	1
72	17	4	1	1
73	18	8	1	1
74	18	5	2	1
75	19	29	1	4
76	19	31	2	6
77	19	53	3	5
78	19	44	4	3
79	19	58	5	5
80	19	54	6	6
81	19	55	7	10
82	19	56	8	12
83	19	59	9	4
84	19	34	10	3
85	20	51	1	5
86	20	33	2	10
87	20	32	3	10
88	21	60	1	4
89	21	59	2	4
90	21	58	3	2
94	22	60	1	4
95	22	59	2	3
96	22	58	3	2
97	23	58	1	2
98	24	58	1	2
99	25	60	1	4
100	26	59	1	3
101	27	61	1	5
102	28	61	1	5
103	29	61	1	5
104	29	59	2	3
107	29	47	3	2
108	30	51	1	5
109	30	50	2	6
110	30	49	3	4
111	30	14	4	1
112	30	55	5	10
113	30	6	6	1
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.exams (id, instructor_id, title, description, duration, total_points, attempts_allowed, randomize_questions, randomize_options, show_results_immediately, require_password, password, available_from, available_until, status, created_at, updated_at, subject_id) FROM stdin;
18	44994161	Sciences Physiques		90	100	3	f	f	f	f		2025-08-18 20:41:00	2025-08-19 20:41:00	active	2025-08-09 20:49:23.256656	2025-08-19 00:44:54.015	13
8	44994161	Essai sur la littérature		30	100	2	f	f	f	f		2025-08-03 15:55:00	2025-08-03 16:25:00	archived	2025-08-03 19:46:40.627522	2025-08-03 19:55:20.932	12
7	44994161	Connaissances générales 3	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	15	6	2	f	f	t	f		2025-08-03 05:15:00	2025-08-03 05:25:00	archived	2025-08-03 05:14:42.93699	2025-08-03 19:55:25.011	10
9	44994161	Test upload		10	100	1	f	f	f	f		2025-08-03 19:58:00	2025-08-03 20:30:00	active	2025-08-03 19:56:44.610547	2025-08-03 19:58:52.331	12
3	44994161	Connaissances générales		10	10	2	t	f	t	t	12345	2025-08-02 22:28:00	2025-08-02 10:40:00	scheduled	2025-08-03 02:07:13.167741	2025-08-03 02:34:34.54	10
10	44994161	General avec Fichier	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. \nThe point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters\n	10	10	2	f	f	f	f		2025-08-03 20:22:00	2025-08-03 20:32:00	active	2025-08-03 20:21:47.879245	2025-08-03 20:21:53.139	10
11	44994161	General avec Fichier 2		10	20	1	f	f	f	f		2025-08-03 20:40:00	2025-08-03 20:50:00	active	2025-08-03 20:38:40.329573	2025-08-03 20:38:50.907	10
4	44994161	Connaissances générales	Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s	10	10	2	f	f	f	t	1234	2025-08-02 23:48:00	2025-08-03 23:58:00	active	2025-08-03 02:44:35.28856	2025-08-03 03:47:43.131	10
12	44994161	Test start exam		10	1	3	f	f	f	f		2025-08-03 20:50:00	2025-08-03 21:00:00	active	2025-08-03 20:50:26.14914	2025-08-03 20:50:41.685	10
5	44994161	Magnetisme		10	10	2	f	f	f	t	12345	2025-08-03 04:23:00	2025-08-03 04:30:00	active	2025-08-03 04:22:30.308762	2025-08-03 04:22:54.01	13
1	44994161	Test sujet	Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s	10	10	2	f	f	f	f		2025-08-03 00:19:00	2025-08-03 00:25:00	archived	2025-08-03 00:59:00.179604	2025-08-03 04:53:18.867	10
6	44994161	Optique - 1ere période	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	10	5	2	t	f	t	f		2025-08-03 05:03:00	2025-08-03 05:13:00	active	2025-08-03 05:03:47.852014	2025-08-03 05:04:11.018	13
29	44994161	Test Matching 4		5	10	3	f	f	f	f		2025-08-22 19:00:00	2025-08-23 12:00:00	active	2025-08-22 23:04:23.886557	2025-08-22 23:14:50.288	16
19	44994161	Archives 1ere Période	Examen d'Archives pour la première période 2025-2026	30	58	3	f	f	f	f		2025-08-20 02:15:00	2025-08-21 02:15:00	active	2025-08-20 02:17:25.751281	2025-08-20 02:21:09.986	19
13	44994161	Test auto refresh		6	1	3	f	f	f	f		2025-08-03 20:29:00	2025-08-03 21:35:00	active	2025-08-03 21:28:03.021623	2025-08-03 21:28:09.088	10
14	44994161	Test auto refresh 2		10	1	3	f	f	f	f		2025-08-03 21:31:00	2025-08-03 21:41:00	active	2025-08-03 21:30:22.135104	2025-08-03 21:30:38.808	1
15	44994161	Test auto refresh 3		5	1	2	f	f	f	f		2025-08-03 21:54:00	2025-08-03 22:00:00	active	2025-08-03 21:52:50.461567	2025-08-03 21:53:04.589	10
20	44994161	Archives Test 1ere Periode 2025-2026		30	100	2	f	f	f	f		2025-08-20 16:55:00	2025-08-20 23:00:00	active	2025-08-20 16:55:12.361126	2025-08-20 17:00:50.544	19
16	44994161	Test sujet 2		10	10	1	f	f	f	f		2025-08-03 22:20:00	2025-08-03 22:30:00	scheduled	2025-08-03 22:00:11.228188	2025-08-04 02:18:26.54	15
17	44994161	Test auto refresh 3		10	1	2	f	f	f	f		2025-08-04 02:20:00	2025-08-04 02:30:00	active	2025-08-04 02:19:34.317488	2025-08-04 02:19:39.535	15
21	44994161	Auto Questions Caonabo		30	10	4	f	f	f	f		2025-08-22 02:14:00	2025-08-22 16:00:00	active	2025-08-22 02:14:15.054549	2025-08-22 02:55:29.935	19
30	44994161	Student Answer Display		30	27	3	f	f	f	f		2025-08-23 01:47:00	2025-08-23 16:00:00	active	2025-08-23 01:47:37.667368	2025-08-23 01:48:06.968	16
22	44994161	Caonabo Bis		15	9	3	f	f	f	f		2025-08-22 18:19:00	2025-08-23 16:00:00	active	2025-08-22 18:18:33.725048	2025-08-22 19:18:18.304	19
23	44994161	Exam Fill in the Blank		90	2	3	f	f	f	f		2025-08-22 19:23:00	2025-08-23 16:00:00	active	2025-08-22 19:22:43.243451	2025-08-22 19:23:01.986	19
24	44994161	Simple Fill in the Blank		10	2	3	f	f	f	f		2025-08-22 19:54:00	2025-08-24 02:00:00	active	2025-08-22 19:53:29.86047	2025-08-22 21:31:03.681	19
25	44994161	Exam Drag and Drop		10	4	3	f	f	f	f		2025-08-22 21:29:00	2025-08-23 16:00:00	active	2025-08-22 21:28:48.395472	2025-08-22 21:31:14.075	19
26	44994161	Exam Matching		10	3	3	f	f	f	f		2025-08-22 21:30:00	2025-08-23 16:00:00	active	2025-08-22 21:29:48.722237	2025-08-22 21:31:43.388	19
27	44994161	Test Matching 2		10	5	3	f	f	f	f		2025-08-22 22:37:00	2025-08-23 16:00:00	active	2025-08-22 22:36:52.855524	2025-08-22 22:37:03.039	16
28	44994161	Test Matching 3	Pour vérifier que l'IA ne nous fout pas dans la marde!	5	5	3	f	f	f	f		2025-08-22 23:00:00	2025-08-23 16:00:00	draft	2025-08-22 22:59:20.541931	2025-08-22 22:59:20.541931	16
\.


--
-- Data for Name: finalized_grades; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.finalized_grades (id, student_id, subject_id, final_grade, assignment_score, assignment_max_score, exam_score, exam_max_score, assignment_coefficient, exam_coefficient, finalized_by, finalized_at) FROM stdin;
1	43280843	19	16.62	0.00	0.00	13.50	65.00	0.2000	0.8000	44994161	2025-08-22 21:47:35.85361
\.


--
-- Data for Name: grade_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.grade_settings (id, course_id, assignment_coefficient, exam_coefficient, created_at, updated_at) FROM stdin;
1	\N	0.2000	0.8000	2025-08-09 20:06:29.165678	2025-08-09 20:06:29.165678
2	13	0.2000	0.8000	2025-08-09 20:08:14.470314	2025-08-09 20:38:27.289
3	7	0.5000	0.5000	2025-08-10 01:21:26.215231	2025-08-20 16:59:03.35
\.


--
-- Data for Name: homework_answers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_answers (id, submission_id, question_id, answer_text, selected_option, attachment_url, link_url, score, max_score, feedback, graded_at, graded_by) FROM stdin;
1	1	1	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).\n	\N	\N	\N	\N	\N	\N	\N	\N
2	1	1	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like). \n\nThere are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.\n	\N	\N	\N	\N	\N	\N	\N	\N
3	1	1	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like). \n\nThere are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc...\n	\N	\N	\N	\N	\N	\N	\N	\N
4	1	1	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like). \n\nThere are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc...\nVoila\n	\N	\N	\N	\N	\N	\N	\N	\N
5	2	3	Rete	\N	\N	\N	\N	\N	\N	\N	\N
6	3	4	Air	\N	\N	\N	\N	\N	\N	\N	\N
8	3	5	Air	\N	\N	\N	\N	\N	\N	\N	\N
7	3	6	Air	\N	\N	\N	98.00	\N	Tu devrais mieux elaborer.	2025-08-09 21:05:29.97	44994161
9	3	7	Air	\N	\N	\N	86.00	\N		2025-08-09 21:06:08.541	44994161
10	4	12	Lorem Ipsum 1	\N	\N	\N	\N	\N	\N	\N	\N
11	4	13	Lorem Ipsum 2	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: homework_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_assignments (id, instructor_id, title, description, subject_id, due_date, attempts_allowed, show_results_immediately, status, created_at, updated_at) FROM stdin;
4	44994161	Le nom de la rose 2		8	2025-08-07 23:07:00	-1	t	active	2025-08-04 03:29:14.510749	2025-08-04 03:29:17.196
3	44994161	C'est quoi le transhumanisme?		16	2025-08-08 15:14:00	-1	t	active	2025-08-04 03:08:06.917469	2025-08-04 04:00:22.451
2	44994161	Le nom de la rose		8	2025-08-07 23:07:00	-1	t	active	2025-08-04 03:04:14.094231	2025-08-04 04:00:35.512
1	44994161	Test Homework 1	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).	17	2025-08-03 22:05:00	-1	t	active	2025-08-04 01:58:56.13033	2025-08-09 23:55:04.357
5	44994161	Etudes de l'air Etudes de l'air Etudes de l'air Etudes de l'air Etudes de l'air Etudes de l'air		13	2025-08-09 21:06:00	-1	t	active	2025-08-09 20:57:34.033761	2025-08-09 23:58:53.366
6	44994161	Connaissances générales		16	2025-08-19 16:00:00	-1	t	active	2025-08-19 01:09:26.013969	2025-08-19 01:09:35.124
\.


--
-- Data for Name: homework_questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_questions (id, homework_id, question_id, "order", points) FROM stdin;
1	4	19	1	2
2	3	19	1	2
3	2	19	1	2
4	5	20	1	1
5	5	19	2	2
6	5	20	1	1
7	5	19	2	2
8	1	19	1	2
9	1	19	1	2
10	5	19	1	2
11	5	19	1	2
12	6	20	1	1
13	6	19	2	2
\.


--
-- Data for Name: homework_submissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.homework_submissions (id, homework_id, student_id, attempt_number, started_at, submitted_at, total_score, max_score, status, is_late, progress_data, last_saved_at) FROM stdin;
1	4	43280843	4	2025-08-04 03:31:12.594	2025-08-04 04:01:19.243	\N	\N	submitted	f	\N	\N
2	2	43280843	1	2025-08-04 04:01:38.584	2025-08-04 04:01:38.584	\N	\N	submitted	f	\N	\N
3	5	43280843	1	2025-08-09 21:03:45.795	2025-08-09 21:03:45.795	4.00	6.00	graded	f	\N	\N
4	6	43280843	2	2025-08-19 01:13:54.629	2025-08-19 01:17:46.816	\N	\N	submitted	f	{"answers": {"12": "Lorem Ipsum 1", "13": "Lorem Ipsum 2"}, "savedAt": "2025-08-19T01:17:30.688Z", "currentQuestionIndex": 1}	2025-08-19 01:17:30.688
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questions (id, instructor_id, title, question_text, question_type, options, correct_answer, explanation, difficulty, blooms_taxonomy, points, time_limit, version, is_active, usage_count, created_at, updated_at, subject_id, attachment_url, category) FROM stdin;
12	44994161	Pre-classement	La révolution haitienne est fille de la révolution française. Expliquez.	essay	\N	\N		easy	analyze	5	\N	1.0	t	0	2025-08-03 18:26:15.040426	2025-08-03 18:27:15.594	17	\N	exam
18	44994161	Chimie minerale	What is the chemical symbol for gold?	short_answer	\N	\N		easy	remember	1	\N	1.0	t	0	2025-08-04 02:35:35.806826	2025-08-04 02:47:33.508	14		exam
26	44994161	Sample Essay	Discuss the causes and effects of World War I.	essay	\N		World War I was caused by complex political tensions and had far-reaching consequences for global politics.	hard	analyze	10	\N	1.0	t	0	2025-08-19 01:33:19.733194	2025-08-19 01:33:19.733194	4	\N	exam
9	44994161	Litterature Haitienne	Existe-t-il une littérature haitienne?	essay	\N	\N		medium	analyze	1	\N	1.0	t	15	2025-08-03 02:02:01.153489	2025-08-03 17:20:54.253	12	\N	exam
17	44994161	General avec Fichier	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	essay	\N	\N	\N	medium	evaluate	10	\N	1.0	t	1	2025-08-03 20:37:11.15239	2025-08-03 20:37:11.15239	10	https://storage.googleapis.com/replit-objstore-f5818c87-82a2-4b00-ae18-5dfcaa5e5530/.private/uploads/828d45a4-9825-470c-90bd-81ed9ba42060	exam
19	44994161	Telephone	Quel est le meilleur telephone au monde?	short_answer	\N	\N		easy	understand	2	\N	1.0	t	0	2025-08-04 02:52:11.095746	2025-08-04 02:52:54.567	16		homework
8	44994161	Connaissances générales	Which planet in our solar system has the shortest day (spins fastest)?	multiple_choice	["Earth", "Jupiter", "Mars", "Venus"]	B	\N	easy	\N	1	\N	1.0	t	13	2025-08-03 02:01:02.823784	2025-08-03 02:01:02.823784	10	\N	exam
7	44994161	Connaissances générales	What is the name of the most famous painting by Leonardo da Vinci?	short_answer	\N	\N	The Mona Lisa	easy	\N	1	\N	1.0	t	5	2025-08-03 01:59:42.989415	2025-08-03 01:59:42.989415	10	\N	exam
27	44994161	Homework Sample	Calculate the area of a rectangle with length 5cm and width 3cm.	short_answer	\N	15 cm²	Area = length × width = 5 × 3 = 15 cm²	easy	apply	2	\N	1.0	t	0	2025-08-19 01:33:19.881448	2025-08-19 01:33:19.881448	1	\N	homework
3	44994161	Connaissances générales	What is the capital city of Canada?	multiple_choice	["Vancouver", "Ottawa", "Montréal", "Toronto"]	B	\N	easy	\N	1	\N	1.0	t	11	2025-08-03 01:46:46.781732	2025-08-03 01:46:46.781732	10	\N	exam
6	44994161	Connaissances générales	The Great Wall of China is the longest wall in the world. It is located in the continent of ___________.	fill_blank	\N	\N	Asia	easy	remember	1	\N	1.0	t	5	2025-08-03 01:59:05.027858	2025-08-03 01:59:05.027858	10	\N	exam
5	44994161	Connaissances générales	What is the largest organ in the human body?	multiple_choice	["Heart", "Brain", "Skin", "Liver"]	C	\N	easy	\N	1	\N	1.0	t	7	2025-08-03 01:56:53.648268	2025-08-03 01:56:53.648268	10	\N	exam
28	44994161	QCM Objectif module 5	Quel est l’objectif principal du module 5 ?	multiple_choice	["A. Numériser les documents d’archives", "B. Gérer les documents courants et intermédiaires à des fins administratives", "C. Évaluer les formats de fichiers numériques", "D. Concevoir une politique de préservation numérique"]	B	Le module présente les activités de gestion des documents courants et intermédiaires.	easy	understand	4	\N	1.0	t	0	2025-08-20 01:58:55.861725	2025-08-20 01:58:55.861725	19	\N	exam
20	44994161	Assignment physique 2	Comment est l'air	multiple_choice	["Ether", "air", "carbone"]	A	\N	medium	understand	1	\N	1.0	t	0	2025-08-09 20:56:35.434769	2025-08-09 20:56:35.434769	13	\N	homework
2	44994161	Géographie	En combien de départements est divisée la République d'Haïti?	multiple_choice	["10", "9", "7", "5"]	A	Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s	medium	\N	1	\N	1.0	t	7	2025-08-03 00:35:27.944611	2025-08-03 01:52:13.132	3	\N	exam
21	44994161	Test sur les arbres frutiers	Lier les arbres et leurs fruits	matching	[{"left": "Mangues", "right": "Manguier"}, {"left": "Avocat", "right": "Avocatiers"}, {"left": "Quenepe", "right": "Quenepier"}]	[{"left":"Mangues","right":"Manguier"},{"left":"Avocat","right":"Avocatiers"},{"left":"Quenepe","right":"Quenepier"}]	\N	medium	\N	5	\N	1.0	t	0	2025-08-09 22:01:01.470667	2025-08-09 22:01:01.470667	2	\N	exam
10	44994161	Chimie minerale	Which gas makes up roughly 78 % of Earth’s atmosphere?\n	multiple_choice	["Oxygen", "Nitrogen", "Argon"]	B	\N	easy	remember	1	\N	1.0	t	0	2025-08-03 16:19:38.493277	2025-08-03 16:19:38.493277	14	\N	exam
4	44994161	Connaissances générales	Which planet is known as the Red Planet?	multiple_choice	["Venus", "Earth", "Mars"]	C	\N	easy	\N	1	\N	1.0	t	7	2025-08-03 01:53:09.002532	2025-08-03 01:53:09.002532	10	\N	exam
11	44994161	Etude des gaz	Which gas makes up roughly 78 % of Earth’s atmosphere?	multiple_choice	["Oxygen", "Carbon dioxyde", "Nitrogen", "Argon"]	C	\N	easy	remember	1	\N	1.0	t	0	2025-08-03 18:23:56.514405	2025-08-03 18:23:56.514405	14	\N	exam
22	44994161	Test sur Ordre	Ranger dans l'ordre decroissant	ranking	["1", "2", "3", "4"]	["1","2","3","4"]	\N	medium	apply	1	\N	1.0	t	0	2025-08-09 22:02:42.890724	2025-08-09 22:02:42.890724	1	\N	exam
16	44994161	Question avec fichier a telecharger	It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters	essay	\N	\N		medium	understand	10	\N	1.0	f	2	2025-08-03 20:17:55.711371	2025-08-03 20:35:42.576	10		exam
13	44994161	Etude des gaz	Which gas makes up roughly 78 % of Earth’s atmosphere?	multiple_choice	["Oxygen", "Carbon dioxyde", "Nitrogen", "Argon"]	C	\N	easy	remember	1	\N	1.0	t	0	2025-08-03 18:26:15.086986	2025-08-03 18:26:15.086986	14	\N	exam
23	44994161	Test sur drag and drop	Drag each planet to the correct category based on whether it is a Terrestrial Planet or a Gas Giant.	drag_drop	[{"zone": "Terrestrial Planets ", "items": [""]}, {"zone": "Gas Giants", "items": [""]}, "Mercury   ", "Neptune", " Uranus  ", "Saturn ", " Jupiter ", "Mars  ", "Earth  ", "Venus"]	{"zones":[{"zone":"Terrestrial Planets ","items":[""]},{"zone":"Gas Giants","items":[""]}],"items":["Mercury   ","Neptune"," Uranus  ","Saturn "," Jupiter ","Mars  ","Earth  ","Venus"]}	\N	medium	understand	8	\N	1.0	t	0	2025-08-09 22:11:47.390051	2025-08-09 22:11:47.390051	2	\N	exam
1	44994161	Géographie	Quelle est la capitale d'Haïti?	multiple_choice	["Jérémie", "Port-au-Prince", "Gonaïves", "Port-Salut"]	B	La capitale d'Haïti est Port-au-Prince, située dans le département de l'Ouest	easy	remember	1	1	1.0	f	1	2025-07-20 22:11:38.27602	2025-07-20 22:11:38.27602	10	\N	exam
24	44994161	Sample Essay	Discuss the causes and effects of World War I.	essay	\N		World War I was caused by complex political tensions and had far-reaching consequences for global politics.	hard	analyze	10	\N	1.0	t	0	2025-08-19 01:27:14.883752	2025-08-19 01:27:14.883752	4	\N	exam
25	44994161	Homework Sample	Calculate the area of a rectangle with length 5cm and width 3cm.	short_answer	\N	15 cm²	Area = length × width = 5 × 3 = 15 cm²	easy	apply	2	\N	1.0	t	0	2025-08-19 01:27:15.029631	2025-08-19 01:27:15.029631	1	\N	homework
15	44994161	Informatique	The dot over the lowercase letters “i” and “j” is called a ______.	fill_blank	\N	\N	\N	easy	remember	1	\N	1.0	t	0	2025-08-03 18:26:15.192939	2025-08-03 18:26:15.192939	16	\N	exam
14	44994161	Histoire des continents	Name the only country that is also a continent.	short_answer	\N	\N	\N	easy	remember	1	\N	1.0	t	2	2025-08-03 18:26:15.146058	2025-08-03 18:26:15.146058	15	\N	exam
30	44994161	QCM Service d’archives externe	Parmi les services d'archives décrits, lequel correspond à un service externe à l’organisation productrice ?	multiple_choice	["A. Service interne de records management", "B. Tiers archivage", "C. Service d’archives intermédiaires internes", "D. Service de gouvernance interne de l’information"]	B	Le service externe peut être un prestataire de tiers archivage ou un service définitif.	medium	analyze	6	\N	1.0	t	0	2025-08-20 01:58:56.012098	2025-08-20 01:58:56.012098	19	\N	exam
35	44994161	Courte Outils méthodes	Que désignent les outils, méthodes et procédures mentionnés ?	short_answer	\N		Pratiques applicables à tous types de documents, y compris numériques.	easy	understand	3	\N	1.0	t	0	2025-08-20 01:58:56.339795	2025-08-20 01:58:56.339795	19	\N	exam
36	44994161	Courte Glossaire	Quelle recommandation fait-on concernant les glossaires et définitions ?	short_answer	\N		Consulter le glossaire officiel du PIAF.	medium	apply	5	\N	1.0	t	0	2025-08-20 01:58:56.405089	2025-08-20 01:58:56.405089	19	\N	exam
37	44994161	Courte Conséquence archiviste absent	Décrivez une conséquence si l’archiviste n’intervient pas dès la création d’un document numérique.	short_answer	\N		Le document peut perdre sa valeur probante ou sa lisibilité.	medium	analyze	5	\N	1.0	t	0	2025-08-20 01:58:56.470429	2025-08-20 01:58:56.470429	19	\N	exam
38	44994161	Courte Enjeux archivistiques	Identifiez deux enjeux archivistiques spécifiques à la préservation numérique.	short_answer	\N		Maintien intégrité/authenticité, conservation du contexte via métadonnées.	hard	analyze	10	\N	1.0	t	0	2025-08-20 01:58:56.537036	2025-08-20 01:58:56.537036	19	\N	exam
39	44994161	Courte Bonnes pratiques	Proposez deux bonnes pratiques dès le stade courant pour garantir l’accessibilité à long terme.	short_answer	\N		Utiliser métadonnées de qualité, planification anticipée.	hard	apply	8	\N	1.0	t	0	2025-08-20 01:58:56.603836	2025-08-20 01:58:56.603836	19	\N	exam
40	44994161	Essai Facteurs organisationnels	Discutez des facteurs organisationnels qui compliquent la mise en place d’une stratégie de préservation numérique.	essay	\N		Facteurs : ressources, coordination, législation.	medium	analyze	10	\N	1.0	t	0	2025-08-20 01:58:56.670157	2025-08-20 01:58:56.670157	19	\N	exam
41	44994161	Essai Plan recommandations	Rédigez un plan de recommandations pour un service d’archives interne renforçant sa gestion des archives numériques.	essay	\N		Sensibilisation, normes documentaires, SAE, nommage, métadonnées, glossaire, collaboration TI.	hard	analyze	15	\N	1.0	t	0	2025-08-20 01:58:56.734489	2025-08-20 01:58:56.734489	19	\N	exam
42	44994161	Fill blank Module 5	Le module 5 constitue une première initiation aux activités et outils de la gestion des documents ___ et ___.	fill_blank	\N		courants|intermédiaires	easy	remember	2	\N	1.0	t	0	2025-08-20 01:58:56.800767	2025-08-20 01:58:56.800767	19	\N	exam
43	44994161	Fill blank Support numérique	Le document d’archives sur support numérique nécessite la médiation d’un ___ et ___ pour être intelligible.	fill_blank	\N		environnement matériel|logiciel	easy	remember	2	\N	1.0	t	0	2025-08-20 01:58:56.863477	2025-08-20 01:58:56.863477	19	\N	exam
45	44994161	Fill blank Authenticité	L’archiviste doit intervenir dès la création pour assurer l’intégrité, l’authenticité, l’exploitabilité et la ___ de l’information.	fill_blank	\N		fiabilité	medium	analyze	3	\N	1.0	t	0	2025-08-20 01:58:56.995125	2025-08-20 01:58:56.995125	19	\N	exam
46	44994161	Fill blank Formats	Les formats de fichiers évoluent constamment et n’offrent pas tous les mêmes garanties de ___ à long terme. Une ___ périodique est donc nécessaire.	fill_blank	\N		conservation|réévaluation	hard	analyze	5	\N	1.0	t	0	2025-08-20 01:58:57.062419	2025-08-20 01:58:57.062419	19	\N	exam
48	44994161	Drag-drop enjeux	Associez chaque catégorie avec son exemple.	drag_drop	{"items": ["PDF/A ou TIFF", "Ressources matérielles", "Obsolescence", "Intégrité et authenticité"], "categories": ["Formats de fichiers pérennes", "Enjeux organisationnels", "Enjeux technologiques", "Enjeux archivistiques"]}	{"Formats de fichiers pérennes":"PDF/A ou TIFF","Enjeux organisationnels":"Ressources matérielles","Enjeux technologiques":"Obsolescence","Enjeux archivistiques":"Intégrité et authenticité"}	Chaque enjeu correspond à un exemple précis.	medium	analyze	4	\N	1.0	t	0	2025-08-20 01:58:57.196235	2025-08-20 01:58:57.196235	19	\N	exam
31	44994161	QCM Rôle archiviste création numérique	Quel est le rôle principal de l’archiviste dès la création des documents numériques ?	multiple_choice	["A. Planifier l’archivage définitif", "B. Identifier les métadonnées, modèles, applications, règles d’accès, sensibiliser les usagers", "C. Numériser les documents physiques", "D. Détruire les documents selon le calendrier"]	B	L’archiviste intervient dès la création pour assurer intégrité, fiabilité, authenticité.	medium	apply	6	\N	1.0	t	1	2025-08-20 01:58:56.07741	2025-08-20 01:58:56.07741	19	\N	exam
44	44994161	Fill blank Service d’archives	Le service d’archives peut être ___, intervenant pour le producteur, ou ___, partie de l’organisation.	fill_blank	\N		externe|interne	medium	analyze	3	\N	1.0	t	1	2025-08-20 01:58:56.929669	2025-08-20 01:58:56.929669	19	\N	exam
34	44994161	Courte Module complémentaire	Nommez un module complémentaire recommandé pour accompagner le module 5.	short_answer	\N		Module 7B ou module 9.	easy	remember	3	\N	1.0	t	1	2025-08-20 01:58:56.274395	2025-08-20 01:58:56.274395	19	\N	exam
33	44994161	QCM Préservation dès création	Pourquoi est-il essentiel d’intégrer la préservation numérique dès la création des documents numériques ?	multiple_choice	["A. Maintenir intégrité et authenticité", "B. Assurer accessibilité future", "C. Supprimer rapidement les documents", "D. Éviter les doublons"]	A,B	L’interopérabilité et l’accessibilité future dépendent d’une intégration précoce.	hard	apply	10	\N	1.0	t	1	2025-08-20 01:58:56.209068	2025-08-20 01:58:56.209068	19	\N	exam
32	44994161	QCM Problèmes technologiques	Quelle problématique technologique particulière est soulevée concernant la préservation des documents numériques dès le stade courant ?	multiple_choice	["A. Obsolescence des plateformes", "B. Formats variés et supports", "C. Problèmes de ressources humaines", "D. Contraintes budgétaires"]	A,B	Les équipements évoluent vite et les formats/supports offrent des garanties variables.	hard	analyze	10	\N	1.0	t	1	2025-08-20 01:58:56.144153	2025-08-20 01:58:56.144153	19	\N	exam
52	44994161	Courte Formats courants	Citez deux formats considérés comme pérennes pour la conservation.	short_answer	\N		PDF/A, TIFF.	easy	remember	3	\N	1.0	t	0	2025-08-20 01:58:57.462481	2025-08-20 01:58:57.462481	19	\N	exam
57	44994161	Fill blank Métadonnées	Les ___ sont essentielles pour assurer la contextualisation et la compréhension d’un document à long terme.	fill_blank	\N		métadonnées	easy	remember	2	\N	1.0	t	0	2025-08-20 01:58:57.792924	2025-08-20 01:58:57.792924	19	\N	exam
29	44994161	QCM Définition document d’archives	Le terme 'document d’archives' tel que défini dans le module désigne :	multiple_choice	["A. Tout document historique uniquement", "B. Une information sur tout support nécessitant prise en charge pour ses valeurs administrative, probante, patrimoniale ou informationnelle", "C. Seulement les documents numériques", "D. Un support physique à conserver à long terme"]	B	La définition inclut la valeur probante, informationnelle ou patrimoniale.	easy	remember	4	\N	1.0	t	1	2025-08-20 01:58:55.943058	2025-08-20 01:58:55.943058	19	\N	exam
53	44994161	Courte Évaluation périodique	Pourquoi faut-il évaluer périodiquement les supports de stockage ?	short_answer	\N		Parce qu’ils vieillissent et deviennent obsolètes.	medium	analyze	5	\N	1.0	t	1	2025-08-20 01:58:57.531112	2025-08-20 01:58:57.531112	19	\N	exam
54	44994161	Courte Authenticité	Donnez un exemple de métadonnée garantissant l’authenticité.	short_answer	\N		Date de création, auteur, signature numérique.	hard	apply	6	\N	1.0	t	1	2025-08-20 01:58:57.595462	2025-08-20 01:58:57.595462	19	\N	exam
65	44994161	Courte Glossaire	Quelle recommandation fait-on concernant les glossaires et définitions ?	short_answer	\N		Consulter le glossaire officiel du PIAF.	medium	apply	5	\N	1.0	t	0	2025-08-23 22:16:52.402095	2025-08-23 22:16:52.402095	19	\N	homework
56	44994161	Essai Impact obsolescence	Analysez l’impact de l’obsolescence des formats sur la conservation numérique.	essay	\N		L’obsolescence empêche l’accès aux documents. Solution : migrations, normalisation des formats.	hard	analyze	12	\N	1.0	t	1	2025-08-20 01:58:57.726924	2025-08-20 01:58:57.726924	19	\N	exam
50	44994161	QCM SAE	Un système d’archivage électronique (SAE) a pour rôle :	multiple_choice	["A. Produire des documents", "B. Assurer la conservation et l’accès sécurisé aux documents numériques", "C. Détruire les documents obsolètes", "D. Gérer les ressources humaines"]	B	Le SAE garantit intégrité, traçabilité et accès.	medium	understand	6	\N	1.0	t	1	2025-08-20 01:58:57.328659	2025-08-20 01:58:57.328659	19	\N	exam
49	44994161	QCM Valeur d’un document	Quelle valeur un document d’archives peut-il avoir ?	multiple_choice	["A. Probatoire", "B. Informationnelle", "C. Patrimoniale", "D. Toutes les réponses"]	D	Un document peut cumuler plusieurs valeurs.	easy	remember	4	\N	1.0	t	1	2025-08-20 01:58:57.26216	2025-08-20 01:58:57.26216	19	\N	exam
55	44994161	Essai Cycle archivistique	Expliquez le cycle de vie d’un document depuis sa création jusqu’au sort final.	essay	\N		Cycle : création, gestion courante, gestion intermédiaire, sort final (élimination ou conservation définitive).	medium	understand	10	\N	1.0	t	2	2025-08-20 01:58:57.661439	2025-08-20 01:58:57.661439	19	\N	exam
61	44994161	Test Question Matching	Reliez les éléments de gauche aux éléments correspondants à droite:	matching	"[{\\"left\\":\\"Jaune\\",\\"right\\":\\"Couleur\\"},{\\"left\\":\\"Chien\\",\\"right\\":\\"Canine\\"},{\\"left\\":\\"Professeur\\",\\"right\\":\\"Ecole\\"},{\\"left\\":\\"Conducteur\\",\\"right\\":\\"Voiture\\"},{\\"left\\":\\"Joueur\\",\\"right\\":\\"Football\\"}]"	[{"left":"Jaune","right":"Couleur"},{"left":"Chien","right":"Canine"},{"left":"Professeur","right":"Ecole"},{"left":"Conducteur","right":"Voiture"},{"left":"Joueur","right":"Football"}]	\N	easy	understand	5	\N	1.0	t	3	2025-08-22 22:34:12.163504	2025-08-22 22:34:12.163504	16	\N	exam
59	44994161	Matching valeurs	Associez chaque valeur avec sa traduction.	matching	[{"left": "Parole", "right": "Pawol"}, {"left": "Bonjou", "right": "Bonjour"}, {"left": "Jour", "right": "Lajounen"}]	[{"left":"Parole","right":"Pawol"},{"left":"Bonjou","right":"Bonjour"},{"left":"Jour","right":"Lajounen"}]	Chaque valeur définit l’importance du document.	easy	understand	3	\N	1.0	t	6	2025-08-20 01:58:57.924388	2025-08-22 19:17:26.493	19		exam
47	44994161	Matching éléments archivistiques	Associez chaque élément à sa définition correcte.	matching	[{"left": "Mer", "right": "Requin"}, {"left": "Lion", "right": "Terre"}]	[{"left":"Mer","right":"Requin"},{"left":"Lion","right":"Terre"}]	Chaque outil joue un rôle précis.	easy	understand	2	\N	1.0	t	3	2025-08-20 01:58:57.129274	2025-08-22 23:13:38.335	19		exam
51	44994161	QCM Sensibilisation	Pourquoi la sensibilisation des usagers est-elle importante dès la création du document ?	multiple_choice	["A. Pour éviter les doublons", "B. Pour assurer le respect des règles de gestion documentaire", "C. Pour réduire les coûts", "D. Pour augmenter la vitesse d’écriture"]	B	La sensibilisation favorise le respect des normes et pratiques archivistiques.	medium	apply	5	\N	1.0	t	2	2025-08-20 01:58:57.395548	2025-08-20 01:58:57.395548	19	\N	exam
62	44994161	QCM Préservation dès création	Pourquoi est-il essentiel d’intégrer la préservation numérique dès la création des documents numériques ?	multiple_choice	["A. Maintenir intégrité et authenticité", "B. Assurer accessibilité future", "C. Supprimer rapidement les documents", "D. Éviter les doublons"]	A,B	L’interopérabilité et l’accessibilité future dépendent d’une intégration précoce.	hard	apply	10	\N	1.0	t	0	2025-08-23 22:16:52.107757	2025-08-23 22:16:52.107757	19	\N	homework
58	44994161	Fin de Caonabo 	Caonabo fut mis en prison à____. Et quelques mois plus tard, embarqué pour l'___	fill_blank	\N		Isabella|Espagne	easy	remember	2	\N	1.0	t	6	2025-08-20 01:58:57.858809	2025-08-22 02:05:27.572	19		exam
60	44994161	Drag-drop supports	Associez chaque support à sa contrainte.	drag_drop	[{"zone": "Land", "items": [""]}, {"zone": "Water", "items": [""]}, "Lion", "Shark", "Salmon", "Dog"]	{"zones":[{"zone":"Land","items":[""]},{"zone":"Water","items":[""]}],"items":["Lion","Shark","Salmon","Dog"]}	Chaque support présente des risques spécifiques.	easy	understand	4	\N	1.0	t	4	2025-08-20 01:58:57.991638	2025-08-22 02:03:22.75	19		exam
63	44994161	Courte Module complémentaire	Nommez un module complémentaire recommandé pour accompagner le module 5.	short_answer	\N		Module 7B ou module 9.	easy	remember	3	\N	1.0	t	0	2025-08-23 22:16:52.227767	2025-08-23 22:16:52.227767	19	\N	homework
64	44994161	Courte Outils méthodes	Que désignent les outils, méthodes et procédures mentionnés ?	short_answer	\N		Pratiques applicables à tous types de documents, y compris numériques.	easy	understand	3	\N	1.0	t	0	2025-08-23 22:16:52.316331	2025-08-23 22:16:52.316331	19	\N	homework
66	44994161	Courte Conséquence archiviste absent	Décrivez une conséquence si l’archiviste n’intervient pas dès la création d’un document numérique.	short_answer	\N		Le document peut perdre sa valeur probante ou sa lisibilité.	medium	analyze	5	\N	1.0	t	0	2025-08-23 22:16:52.48825	2025-08-23 22:16:52.48825	19	\N	homework
67	44994161	Courte Enjeux archivistiques	Identifiez deux enjeux archivistiques spécifiques à la préservation numérique.	short_answer	\N		Maintien intégrité/authenticité, conservation du contexte via métadonnées.	hard	analyze	10	\N	1.0	t	0	2025-08-23 22:16:52.575869	2025-08-23 22:16:52.575869	19	\N	homework
68	44994161	Courte Bonnes pratiques	Proposez deux bonnes pratiques dès le stade courant pour garantir l’accessibilité à long terme.	short_answer	\N		Utiliser métadonnées de qualité, planification anticipée.	hard	apply	8	\N	1.0	t	0	2025-08-23 22:16:52.66553	2025-08-23 22:16:52.66553	19	\N	homework
69	44994161	Essai Facteurs organisationnels	Discutez des facteurs organisationnels qui compliquent la mise en place d’une stratégie de préservation numérique.	essay	\N		Facteurs : ressources, coordination, législation.	medium	analyze	10	\N	1.0	t	0	2025-08-23 22:16:52.750847	2025-08-23 22:16:52.750847	19	\N	homework
70	44994161	Essai Plan recommandations	Rédigez un plan de recommandations pour un service d’archives interne renforçant sa gestion des archives numériques.	essay	\N		Sensibilisation, normes documentaires, SAE, nommage, métadonnées, glossaire, collaboration TI.	hard	analyze	15	\N	1.0	t	0	2025-08-23 22:16:52.838387	2025-08-23 22:16:52.838387	19	\N	homework
71	44994161	Fill blank Module 5	Le module 5 constitue une première initiation aux activités et outils de la gestion des documents ___ et ___.	fill_blank	\N		courants|intermédiaires	easy	remember	2	\N	1.0	t	0	2025-08-23 22:16:52.928677	2025-08-23 22:16:52.928677	19	\N	homework
72	44994161	Fill blank Support numérique	Le document d’archives sur support numérique nécessite la médiation d’un ___ et ___ pour être intelligible.	fill_blank	\N		environnement matériel|logiciel	easy	remember	2	\N	1.0	t	0	2025-08-23 22:16:53.016629	2025-08-23 22:16:53.016629	19	\N	homework
73	44994161	Fill blank Service d’archives	Le service d’archives peut être ___, intervenant pour le producteur, ou ___, partie de l’organisation.	fill_blank	\N		externe|interne	medium	analyze	3	\N	1.0	t	0	2025-08-23 22:16:53.10576	2025-08-23 22:16:53.10576	19	\N	homework
74	44994161	Fill blank Authenticité	L’archiviste doit intervenir dès la création pour assurer l’intégrité, l’authenticité, l’exploitabilité et la ___ de l’information.	fill_blank	\N		fiabilité	medium	analyze	3	\N	1.0	t	0	2025-08-23 22:16:53.192479	2025-08-23 22:16:53.192479	19	\N	homework
75	44994161	Fill blank Formats	Les formats de fichiers évoluent constamment et n’offrent pas tous les mêmes garanties de ___ à long terme. Une ___ périodique est donc nécessaire.	fill_blank	\N		conservation|réévaluation	hard	analyze	5	\N	1.0	t	0	2025-08-23 22:16:53.283415	2025-08-23 22:16:53.283415	19	\N	homework
76	44994161	Matching éléments archivistiques	Associez chaque élément à sa définition correcte.	matching	{"leftItems": ["Glossaire du PIAF", "SAE", "Plan de classement", "Métadonnées de préservation"], "rightItems": ["Document consultable pour les définitions", "Application dédiée à la conservation", "Outil d’organisation intellectuelle", "Données essentielles à l’authenticité"]}	{"Glossaire du PIAF":"Document consultable pour les définitions","SAE":"Application dédiée à la conservation","Plan de classement":"Outil d’organisation intellectuelle","Métadonnées de préservation":"Données essentielles à l’authenticité"}	Chaque outil joue un rôle précis.	medium	understand	6	\N	1.0	t	0	2025-08-23 22:16:53.371671	2025-08-23 22:16:53.371671	19	\N	homework
77	44994161	Drag-drop enjeux	Associez chaque catégorie avec son exemple.	drag_drop	{"items": ["PDF/A ou TIFF", "Ressources matérielles", "Obsolescence", "Intégrité et authenticité"], "categories": ["Formats de fichiers pérennes", "Enjeux organisationnels", "Enjeux technologiques", "Enjeux archivistiques"]}	{"Formats de fichiers pérennes":["PDF/A ou TIFF"],"Enjeux organisationnels":["Ressources matérielles"],"Enjeux technologiques":["Obsolescence"],"Enjeux archivistiques":["Intégrité et authenticité"]}	Chaque enjeu correspond à un exemple précis.	medium	analyze	4	\N	1.0	t	0	2025-08-23 22:16:53.460489	2025-08-23 22:16:53.460489	19	\N	homework
78	44994161	QCM Valeur d’un document	Quelle valeur un document d’archives peut-il avoir ?	multiple_choice	["A. Probatoire", "B. Informationnelle", "C. Patrimoniale", "D. Toutes les réponses"]	D	Un document peut cumuler plusieurs valeurs.	easy	remember	4	\N	1.0	t	0	2025-08-23 22:16:53.54853	2025-08-23 22:16:53.54853	19	\N	homework
79	44994161	QCM SAE	Un système d’archivage électronique (SAE) a pour rôle :	multiple_choice	["A. Produire des documents", "B. Assurer la conservation et l’accès sécurisé aux documents numériques", "C. Détruire les documents obsolètes", "D. Gérer les ressources humaines"]	B	Le SAE garantit intégrité, traçabilité et accès.	medium	understand	6	\N	1.0	t	0	2025-08-23 22:16:53.635956	2025-08-23 22:16:53.635956	19	\N	homework
80	44994161	QCM Sensibilisation	Pourquoi la sensibilisation des usagers est-elle importante dès la création du document ?	multiple_choice	["A. Pour éviter les doublons", "B. Pour assurer le respect des règles de gestion documentaire", "C. Pour réduire les coûts", "D. Pour augmenter la vitesse d’écriture"]	B	La sensibilisation favorise le respect des normes et pratiques archivistiques.	medium	apply	5	\N	1.0	t	0	2025-08-23 22:16:53.723212	2025-08-23 22:16:53.723212	19	\N	homework
81	44994161	Courte Formats courants	Citez deux formats considérés comme pérennes pour la conservation.	short_answer	\N		PDF/A, TIFF.	easy	remember	3	\N	1.0	t	0	2025-08-23 22:16:53.814083	2025-08-23 22:16:53.814083	19	\N	homework
82	44994161	Courte Évaluation périodique	Pourquoi faut-il évaluer périodiquement les supports de stockage ?	short_answer	\N		Parce qu’ils vieillissent et deviennent obsolètes.	medium	analyze	5	\N	1.0	t	0	2025-08-23 22:16:53.90193	2025-08-23 22:16:53.90193	19	\N	homework
83	44994161	Courte Authenticité	Donnez un exemple de métadonnée garantissant l’authenticité.	short_answer	\N		Date de création, auteur, signature numérique.	hard	apply	6	\N	1.0	t	0	2025-08-23 22:16:53.989042	2025-08-23 22:16:53.989042	19	\N	homework
84	44994161	Essai Cycle archivistique	Expliquez le cycle de vie d’un document depuis sa création jusqu’au sort final.	essay	\N		Cycle : création, gestion courante, gestion intermédiaire, sort final (élimination ou conservation définitive).	medium	understand	10	\N	1.0	t	0	2025-08-23 22:16:54.078424	2025-08-23 22:16:54.078424	19	\N	homework
85	44994161	Essai Impact obsolescence	Analysez l’impact de l’obsolescence des formats sur la conservation numérique.	essay	\N		L’obsolescence empêche l’accès aux documents. Solution : migrations, normalisation des formats.	hard	analyze	12	\N	1.0	t	0	2025-08-23 22:16:54.167916	2025-08-23 22:16:54.167916	19	\N	homework
86	44994161	Fill blank Métadonnées	Les ___ sont essentielles pour assurer la contextualisation et la compréhension d’un document à long terme.	fill_blank	\N		métadonnées	easy	remember	2	\N	1.0	t	0	2025-08-23 22:16:54.257664	2025-08-23 22:16:54.257664	19	\N	homework
87	44994161	Fill blank Archivage numérique	L’archivage numérique suppose une ___ précoce et une ___ continue.	fill_blank	\N		planification|gestion	hard	apply	5	\N	1.0	t	0	2025-08-23 22:16:54.34481	2025-08-23 22:16:54.34481	19	\N	homework
88	44994161	Matching valeurs	Associez chaque valeur avec sa définition.	matching	{"leftItems": ["Valeur probatoire", "Valeur informationnelle", "Valeur patrimoniale"], "rightItems": ["Prouver un droit", "Informer sur une activité", "Témoigner du patrimoine"]}	{"Valeur probatoire":"Prouver un droit","Valeur informationnelle":"Informer sur une activité","Valeur patrimoniale":"Témoigner du patrimoine"}	Chaque valeur définit l’importance du document.	easy	understand	4	\N	1.0	t	0	2025-08-23 22:16:54.431992	2025-08-23 22:16:54.431992	19	\N	homework
89	44994161	Drag-drop supports	Associez chaque support à sa contrainte.	drag_drop	{"items": ["Durée de vie limitée", "Obsolescence technologique", "Dépendance au fournisseur"], "categories": ["CD-ROM", "Disque dur", "Cloud"]}	{"Formats de fichiers pérennes":["PDF/A ou TIFF"],"Enjeux organisationnels":["Ressources matérielles"],"Enjeux technologiques":["Obsolescence"],"Enjeux archivistiques":["Intégrité et authenticité"]}	Chaque support présente des risques spécifiques.	medium	analyze	5	\N	1.0	t	0	2025-08-23 22:16:54.52061	2025-08-23 22:16:54.52061	19	\N	homework
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
erBNsffdla0u4As5JaS6ZjQApiEgY3G1	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T21:51:58.940Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755989518, "iat": 1755985918, "iss": "https://replit.com/oidc", "sub": "44994161", "email": "admin@kaliteksolutions.com", "at_hash": "mvIEpYMfsTFwtOMJ6kyxHA", "username": "admin3598", "auth_time": 1755563602, "last_name": "Kalitek", "first_name": "Admin"}, "expires_at": 1755989518, "access_token": "HLPJ6Z5Af23fDn2uFPM7fxgxKKPmJ7SMyuuqCfQd-1y", "refresh_token": "JecXX87M9E0u7bsmV6jrgD6PtOpIu8-VNcR0cwjvkpb"}}}	2025-08-30 22:17:21
TVttGrDG2mypLDtl6kSZvvJOh_a3dpxZ	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T21:50:11.544Z", "httpOnly": true, "originalMaxAge": 604799999}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755989411, "iat": 1755985811, "iss": "https://replit.com/oidc", "sub": "43280843", "email": "erick.toussaint23@gmail.com", "at_hash": "Vzvg1jvOT8Rb6OskMsYs2Q", "username": "erickt23", "auth_time": 1755985811, "last_name": "Toussaint", "first_name": "Erick", "profile_image_url": "https://storage.googleapis.com/replit/images/1751394562545_25781840c7f87620729093198a607f40.jpeg"}, "expires_at": 1755989411, "access_token": "kXjMLnNTxsdNhq565wPocdR66nsd6fTrxv7iZXUCP2G", "refresh_token": "1Lw5LoshbK94gRiiFY7q6QB42higgBGHbAzEwg-pzyM"}}}	2025-08-30 21:51:51
rpmfhQrYyv-4uwJLDgMsu6Rw9yQcMZgC	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T21:38:08.477Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755988688, "iat": 1755985088, "iss": "https://replit.com/oidc", "sub": "43280843", "email": "erick.toussaint23@gmail.com", "at_hash": "SjFdkpwaBPOkcuHSdVeDcg", "username": "erickt23", "auth_time": 1755656485, "last_name": "Toussaint", "first_name": "Erick", "profile_image_url": "https://storage.googleapis.com/replit/images/1751394562545_25781840c7f87620729093198a607f40.jpeg"}, "expires_at": 1755988688, "access_token": "VMByTM_3RZRCaJmdfO2sZk0qFCZYZPXAbM7A7v2ejaK", "refresh_token": "xPfuXJ3NoNgaW79AZokS1oGEz4exE3w3qqY75XRMPiZ"}}}	2025-08-30 22:29:50
1yV955P1RRGVu-KZpZP4pOqZpdrYokZl	{"cookie": {"path": "/", "secure": true, "expires": "2025-08-30T21:31:10.755Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "8da689de-5958-4074-ba3d-ec2553876569", "exp": 1755988270, "iat": 1755984670, "iss": "https://replit.com/oidc", "sub": "46783927", "email": "metminwi@gmail.com", "at_hash": "AEscOBTvxl99ObxxwJ1wKg", "username": "metminwi1", "auth_time": 1755915695, "last_name": null, "first_name": null}, "expires_at": 1755988270, "access_token": "fQW7O2n_QvqvJFyEPa3qtaAYXkb6FkeVBvFIs3TQEHc", "refresh_token": "5tvJ0XNCWOPoz0xxQ-jayt-L3kwTk1hdmuGP9n7q62t"}}}	2025-08-30 22:29:48
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subjects (id, name, description, is_active, created_at, updated_at) FROM stdin;
1	Mathematics	Algebra, Calculus, Geometry, Statistics and other math topics	t	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
2	Science	Physics, Chemistry, Biology and other science subjects	t	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
3	English	Literature, Writing, Grammar and Language Arts	t	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
4	History	World History, American History, and Social Studies	t	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
5	Computer Science	Programming, Algorithms, Data Structures and Technology	t	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
9	Physical Education	Sports, Health and Physical Fitness	t	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
10	General	Miscellaneous and Cross-curricular topics	t	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
11	Religion	Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s	t	2025-08-03 01:23:24.967176	2025-08-03 01:23:24.967176
14	Chimie		t	2025-08-03 16:19:01.721879	2025-08-03 16:19:01.721879
15	Géographie		t	2025-08-03 18:24:51.203907	2025-08-03 18:24:51.203907
16	Connaissances générales		t	2025-08-03 18:25:05.25703	2025-08-03 18:25:05.25703
17	Histoire		t	2025-08-03 18:26:07.156369	2025-08-03 18:26:07.156369
18	Sciences Naturelles		t	2025-08-09 21:59:56.898181	2025-08-09 21:59:56.898181
7	Arts Plastiques	Visual Arts, Music, Drama and Creative subjects	t	2025-08-03 00:45:37.544404	2025-08-09 22:23:11.265
8	Langues	Foreign Languages and Language Learning	t	2025-08-03 00:45:37.544404	2025-08-09 22:23:31.737
13	Physiques	Sciences Physiques	t	2025-08-03 04:20:19.013699	2025-08-09 22:24:10.063
12	Littérature Haïtienne	Cours de Littérature Haïtienne	t	2025-08-03 02:01:57.046345	2025-08-09 22:24:49.309
6	Business	Economics, Finance, Management and Business Studies	f	2025-08-03 00:45:37.544404	2025-08-03 00:45:37.544404
19	Archives	Techniques d'archives	t	2025-08-20 01:55:17.7801	2025-08-20 01:55:40.342
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.submissions (id, exam_id, student_id, attempt_number, started_at, submitted_at, time_taken, total_score, max_score, status, is_late, progress_data, last_saved_at, time_remaining_seconds, is_highest_score) FROM stdin;
33	26	43280843	1	2025-08-22 21:45:43.876305	2025-08-22 21:45:43.861	\N	2.00	3.00	graded	f	\N	\N	\N	t
25	21	43280843	1	2025-08-22 02:55:56.732497	2025-08-22 02:55:56.717	\N	2.00	10.00	graded	f	\N	\N	\N	t
19	19	43280843	1	2025-08-20 02:41:17.102414	\N	\N	\N	\N	in_progress	f	{"answers": {"29": "B", "31": "B", "34": "Lorem Ipsum", "53": "Lorem Ipsum", "54": "Lorem Ipsum", "55": "Lorem Ipsum", "56": "Lorem Ipsum"}, "savedAt": "2025-08-20T03:48:47.387Z", "currentQuestionIndex": 9, "timeRemainingSeconds": 1528}	2025-08-20 03:48:47.387	1528	f
32	26	43280843	1	2025-08-22 21:38:28.768875	\N	\N	\N	\N	in_progress	f	{"answers": {"59": {"0": "Pawol", "1": "Bonjour", "2": "Lajounen"}}, "savedAt": "2025-08-22T21:42:58.734Z", "currentQuestionIndex": 0, "timeRemainingSeconds": 569}	2025-08-22 21:42:58.734	569	f
44	30	46783927	1	2025-08-23 02:42:14.919907	2025-08-23 02:42:14.905	\N	5.00	27.00	pending	f	\N	\N	\N	f
20	19	43280843	1	2025-08-20 03:49:32.794218	2025-08-20 03:49:32.778	\N	0.00	46.00	pending	f	\N	\N	\N	f
29	23	43280843	1	2025-08-22 19:25:08.070279	2025-08-22 19:25:08.056	\N	0.00	2.00	graded	f	\N	\N	\N	f
10	10	43280843	1	2025-08-03 20:37:08.151904	2025-08-03 20:37:08.138	13	0.00	10.00	pending	f	\N	\N	\N	f
11	11	43280843	1	2025-08-03 20:41:44.948425	2025-08-03 20:41:44.933	0	0.00	20.00	pending	f	\N	\N	\N	f
39	29	43280843	1	2025-08-23 00:59:41.580413	2025-08-23 00:59:41.565	\N	10.00	10.00	graded	f	\N	\N	\N	f
38	29	43280843	1	2025-08-22 23:23:58.80666	2025-08-22 23:23:58.791	\N	10.00	10.00	graded	f	\N	\N	\N	f
28	23	43280843	1	2025-08-22 19:23:37.736268	2025-08-22 19:23:37.721	\N	1.50	2.00	graded	f	\N	\N	\N	t
7	8	43280843	1	2025-08-03 19:47:27.256068	2025-08-03 19:47:27.241	0	0.00	0.00	graded	f	\N	\N	\N	f
15	18	43280843	1	2025-08-09 20:51:06.981693	2025-08-09 20:51:06.965	0	2.00	2.00	graded	f	\N	\N	\N	f
16	18	43280843	1	2025-08-19 00:54:10.263572	2025-08-19 00:54:10.248	1	2.00	2.00	graded	f	\N	\N	\N	f
34	27	43280843	1	2025-08-22 22:38:03.109233	2025-08-22 22:38:03.094	\N	0.00	5.00	graded	f	\N	\N	\N	f
17	18	43280843	1	2025-08-19 01:00:58.148041	\N	\N	\N	\N	in_progress	f	{"answers": {"5": {"selectedOption": "C"}, "8": {"selectedOption": "B"}}, "savedAt": "2025-08-19T01:08:02.405Z", "currentQuestionIndex": 1, "timeRemainingSeconds": 5304}	2025-08-19 01:08:02.405	5304	f
35	27	43280843	1	2025-08-22 22:42:57.276397	2025-08-22 22:42:57.26	\N	4.00	5.00	graded	f	\N	\N	\N	t
36	27	43280843	1	2025-08-22 22:51:20.043807	2025-08-22 22:51:20.029	\N	5.00	5.00	graded	f	\N	\N	\N	f
21	20	43280843	1	2025-08-20 17:03:04.905855	\N	\N	\N	\N	in_progress	f	{"answers": {"32": "A", "33": "B", "51": "B"}, "savedAt": "2025-08-20T17:04:42.242Z", "currentQuestionIndex": 2, "timeRemainingSeconds": 1779}	2025-08-20 17:04:42.242	1779	f
37	29	43280843	1	2025-08-22 23:16:51.883341	\N	\N	\N	\N	in_progress	f	{"answers": {"47": {"0": "Requin", "1": "Terre"}, "59": {"0": "Pawol", "1": "Bonjour", "2": "Lajounen"}, "61": {"0": "Couleur", "1": "Canine", "2": "Ecole", "3": "Voiture", "4": "Football"}}, "savedAt": "2025-08-23T01:33:06.485Z", "currentQuestionIndex": 2, "timeRemainingSeconds": 228}	2025-08-23 01:33:06.485	228	f
40	29	43280843	1	2025-08-23 01:33:30.017866	2025-08-23 01:33:30.002	\N	10.00	10.00	graded	f	\N	\N	\N	t
43	30	46783927	1	2025-08-23 02:42:00.682047	\N	\N	\N	\N	in_progress	f	{"answers": {"14": "Australia", "49": "A", "50": "C", "51": "B"}, "savedAt": "2025-08-23T02:42:00.691Z", "currentQuestionIndex": 3, "timeRemainingSeconds": 1775}	2025-08-23 02:42:00.691	1775	f
41	30	43280843	1	2025-08-23 01:49:18.074776	\N	\N	\N	\N	in_progress	f	{"answers": {"14": "Australia", "49": "D", "50": "B", "51": "B", "55": "Lorem Ipsum"}, "savedAt": "2025-08-23T01:51:03.275Z", "currentQuestionIndex": 4, "timeRemainingSeconds": 1694}	2025-08-23 01:51:03.275	1694	f
42	30	43280843	1	2025-08-23 01:51:54.143048	2025-08-23 01:51:54.128	\N	25.00	27.00	graded	f	\N	\N	\N	t
1	1	43280843	1	2025-08-03 01:09:31.741799	2025-08-03 01:09:31.654	0	2.00	2.00	graded	f	\N	\N	\N	t
2	3	43280843	1	2025-08-03 02:11:50.274807	2025-08-03 02:11:50.18	1	0.00	0.00	graded	f	\N	\N	\N	t
5	6	43280843	1	2025-08-03 05:05:03.606715	2025-08-03 05:05:03.592	0	3.00	5.00	graded	f	\N	\N	\N	t
6	7	43280843	1	2025-08-03 05:17:36.983768	2025-08-03 05:17:36.968	0	5.00	6.00	graded	f	\N	\N	\N	t
9	9	43280843	1	2025-08-03 19:59:40.501983	2025-08-03 19:59:40.486	0	1.00	1.00	graded	f	\N	\N	\N	t
12	12	43280843	1	2025-08-03 20:56:02.364291	2025-08-03 20:56:02.348	0	1.00	1.00	graded	f	\N	\N	\N	t
13	16	43280843	1	2025-08-03 22:01:53.436298	2025-08-03 22:01:53.42	0	0.50	1.00	graded	f	\N	\N	\N	t
14	17	43280843	1	2025-08-04 02:20:21.042671	2025-08-04 02:20:21.028	0	1.00	1.00	graded	f	\N	\N	\N	t
4	5	43280843	1	2025-08-03 04:24:06.047942	2025-08-03 04:24:06.033	0	4.00	6.00	graded	f	\N	\N	\N	t
8	8	43280843	1	2025-08-03 19:48:00.29818	2025-08-03 19:48:00.284	0	0.00	0.00	graded	f	\N	\N	\N	t
18	18	43280843	1	2025-08-19 01:08:21.682126	2025-08-19 01:08:21.664	0	2.00	2.00	graded	f	\N	\N	\N	t
22	20	43280843	1	2025-08-20 17:04:49.487284	2025-08-20 17:04:49.472	\N	0.00	25.00	graded	f	\N	\N	\N	t
45	24	46783927	1	2025-08-23 18:40:02.902348	2025-08-23 18:40:02.887	\N	0.00	2.00	pending	f	\N	\N	\N	f
3	4	43280843	1	2025-08-03 03:49:59.349565	2025-08-03 03:49:57.251	1	\N	9.00	pending	f	\N	\N	\N	t
27	22	43280843	1	2025-08-22 19:20:00.814903	2025-08-22 19:20:00.8	\N	0.00	9.00	graded	f	\N	\N	\N	f
26	22	43280843	1	2025-08-22 18:19:50.579657	2025-08-22 18:19:50.564	\N	7.00	10.00	graded	f	\N	\N	\N	t
30	24	43280843	1	2025-08-22 21:33:03.776798	2025-08-22 21:33:03.762	\N	1.00	2.00	graded	f	\N	\N	\N	f
24	21	43280843	1	2025-08-22 02:38:27.435489	2025-08-22 02:38:27.419	\N	\N	10.00	pending	f	\N	\N	\N	f
23	21	43280843	1	2025-08-22 02:17:40.033462	\N	\N	\N	\N	in_progress	f	{"answers": {"58": ["Isabella", "Espagne"], "59": {"0": "Pawol", "1": "Bonjour", "2": "Lajounen", "3": "Aswe"}, "60": {"0": ["Lion", "Dog"], "1": ["Salmon", "Shark"]}}, "savedAt": "2025-08-22T02:55:22.349Z", "currentQuestionIndex": 1, "timeRemainingSeconds": 1489}	2025-08-22 02:55:22.349	1489	f
31	24	43280843	1	2025-08-22 21:35:16.458775	2025-08-22 21:35:16.444	\N	2.00	2.00	graded	f	\N	\N	\N	t
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
46783927	metminwi@gmail.com	\N	\N	\N	student	2025-08-23 02:21:35.994725	2025-08-23 02:21:35.994725	\N
43280843	erick.toussaint23@gmail.com	Erick	Toussaint	https://storage.googleapis.com/replit/images/1751394562545_25781840c7f87620729093198a607f40.jpeg	student	2025-07-20 21:39:27.253358	2025-08-23 21:50:11.47	\N
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

