# EduExam Pro - Comprehensive Exam Generator System

## Overview

EduExam Pro is a full-stack web application for creating, managing, and grading exams. The system is built with a modern tech stack featuring React with TypeScript on the frontend, Express.js with Node.js on the backend, and PostgreSQL as the database. The application supports role-based access control with separate interfaces for instructors and students.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React 18 with TypeScript and follows a component-based architecture:
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent UI components
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod schema validation
- **Authentication**: Session-based authentication with automatic redirect handling

The frontend is organized with:
- `/client/src/pages/` - Route components separated by user roles (instructor/student)
- `/client/src/components/` - Reusable UI components including modals and layouts
- `/client/src/hooks/` - Custom React hooks for authentication and utilities
- `/client/src/lib/` - Utility functions and API client configuration

### Backend Architecture
The backend follows a RESTful API design with Express.js:
- **Framework**: Express.js with TypeScript
- **Authentication**: Replit OpenID Connect integration with session management
- **Database Access**: Drizzle ORM for type-safe database operations
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **API Design**: Resource-based endpoints with proper HTTP status codes and error handling

The backend is structured with:
- `/server/routes.ts` - API route definitions and handlers
- `/server/storage.ts` - Database abstraction layer
- `/server/db.ts` - Database connection and configuration
- `/server/replitAuth.ts` - Authentication middleware and configuration

## Key Components

### Database Schema
The application uses PostgreSQL with the following main entities:
- **Users**: Stores user information with role-based access (instructor/student)
- **Questions**: Question bank with support for multiple question types (multiple choice, short answer, essay, fill-in-blank)
- **Exams**: Exam metadata including settings, scheduling, and configuration
- **Exam Questions**: Junction table linking exams to questions with order and points
- **Submissions**: Student exam submissions with completion tracking
- **Answers**: Individual answer records for each question in a submission
- **Sessions**: Session storage for authentication

### Question Management
- Support for multiple question types with different difficulty levels
- Bloom's Taxonomy classification for educational alignment
- Question reusability across multiple exams
- Usage tracking and analytics

### Exam System
- Flexible exam configuration with time limits, attempts, and randomization
- Password protection and scheduling capabilities
- Auto-grading for objective questions
- Manual grading interface for subjective questions

### Final Grade Calculation System
- Configurable weighted grading system combining assignments and exams
- Default formula: Final Grade = 40% Assignment Score + 60% Exam Score
- Coefficients easily configurable in `shared/gradeConfig.ts`
- Letter grade mapping (A+ through F) with percentage thresholds
- Real-time grade calculation and display in instructor grading interface
- Per-subject grade calculations for comprehensive course management

### Role-Based Access Control
- **Instructors**: Full access to question creation, exam management, grading, and analytics
- **Students**: Access to assigned exams, submission history, and grade viewing
- Session-based authentication with automatic session management

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit OpenID Connect, sessions are stored in PostgreSQL
2. **Question Creation**: Instructors create questions that are stored in the question bank for reuse
3. **Exam Creation**: Instructors select questions from the bank to create exams with specific configurations
4. **Exam Taking**: Students access assigned exams, submit answers that are stored with completion tracking
5. **Grading**: Automatic grading for objective questions, manual grading interface for subjective responses
6. **Analytics**: Real-time statistics and performance tracking for instructors

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection via Neon serverless
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI primitives for component library
- **react-hook-form**: Form handling with validation
- **zod**: Schema validation for forms and API data

### Authentication
- **openid-client**: OpenID Connect client for Replit authentication
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **shadcn/ui**: Pre-built accessible components
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

## Deployment Strategy

The application is designed for deployment on Replit with the following configuration:
- **Development**: Vite dev server with HMR for frontend, tsx with nodemon for backend
- **Production**: Vite build generates static assets, esbuild bundles the server
- **Database**: Neon PostgreSQL serverless database with connection pooling
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, REPLIT_DOMAINS, ISSUER_URL
- **Build Process**: Single command builds both frontend and backend for production deployment

The system uses a monorepo structure with shared TypeScript types and schemas between frontend and backend, ensuring type safety across the entire application stack.