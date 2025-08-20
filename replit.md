# EduExam Pro - Comprehensive Exam Generator System

## Overview

EduExam Pro is a full-stack web application for creating, managing, and grading exams. The system is built with a modern tech stack featuring React with TypeScript on the frontend, Express.js with Node.js on the backend, and PostgreSQL as the database. The application supports role-based access control with separate interfaces for instructors and students.

## User Preferences

Preferred communication style: Simple, everyday language.
Navigation terminology preferences:
- "Exam Questions" → "Exam Bank" (under Exam Management accordion)
- "Homework Questions" → "Assignment Bank" (under Assignment Management accordion)
- "Homework Assignment" → "Assignments" (under Assignment Management accordion)
- "Exams" → "Exams" (under Exam Management accordion)

Recent UI Changes (August 2025):
- Implemented accordion-style sidebar navigation with two main sections:
  - "Exam Management" accordion containing "Exam Bank" and "Exams"
  - "Assignment Management" accordion containing "Assignment Bank" and "Assignments"
- Applied vibrant gradient styling system across all primary action buttons
- Consistent blue-to-indigo gradients with hover effects and scaling animations
- Updated all page titles to match new menu names for consistency
- Renamed "Question Bank" to "Exam Bank" across all translations and components (August 2025)
- Enhanced French and Haitian Creole translation coverage for Assignment Bank interface
- Added comprehensive navigation translations with proper multi-language sidebar support
- **Dark Mode Implementation** (August 12, 2025):
  - Implemented comprehensive Dark Mode functionality with theme context and localStorage persistence
  - Applied Twitter (Web) dark mode color template for consistent, professional styling
  - Colors: Background (#15202B), Card (#192734), Hover (#22303C), Primary Text (#FFFFFF), Secondary Text (#8899A6)
  - Updated all major components (dashboard, sidebar, navbar) with dark mode variants
  - Theme toggle integrated into navbar with full translation support
- **Multiple Attempts Fix** (August 19, 2025):
  - Fixed critical bug where edited, duplicated, and republished exams weren't appearing as available for students
  - Corrected exam status logic to properly handle multiple attempts - students can now retake exams until all attempts are exhausted
  - Enhanced status labels to show remaining attempts information for better user experience
  - Ensures exams remain active until all allowed attempts are completed
- **Save Progress Functionality** (August 19, 2025):
  - Implemented comprehensive Save Progress system for both exams and homework assignments
  - Added database schema extensions with progressData, lastSavedAt, and timeRemainingSeconds fields
  - Created auto-save functionality that saves progress every 30 seconds during active work
  - Added manual "Save Progress" buttons to both exam and homework interfaces
  - Implemented progress restoration when students return to incomplete assignments
  - Enhanced exam status system to recognize and display "Resume Exam" for in-progress submissions
  - Students can now safely leave and return to assignments without losing work
  - Fixed homework progress restoration priority to ensure saved progress takes precedence over existing submissions
- **Enhanced Question Import System** (August 19, 2025):
  - Updated Excel import functionality to support all question types: multiple_choice, short_answer, essay, fill_blank, matching, ranking, drag_drop
  - Enhanced server-side validation to properly parse complex question formats (JSON for matching/ranking, pipe-separated for fill_blank)
  - Added comprehensive import instructions with detailed examples for advanced question types
  - Created updated Excel template (exam_bank_import_template_updated.xlsx) with examples for all question types
  - Added support for 'category' field to separate exam and homework questions during import
  - **Implemented duplicate prevention system** - checks title, question text, type, subject, and category to prevent duplicate questions
  - Added warning display for skipped duplicates with clear feedback in import results
  - Fixed import modal scrolling and layout for better user experience
- **Fixed Exam Taking Routing Issue** (August 20, 2025):
  - Created dedicated StudentExamTaking component to handle `/exams/:id/take` routes
  - Fixed critical 404 error where students couldn't access exam taking interface
  - Updated routing in App.tsx to properly handle exam taking navigation
  - Migrated from inline exam taking to dedicated page component for better separation of concerns
  - Students can now properly access and take exams without page not found errors
- **Fixed Multiple Exam System Issues** (August 20, 2025):
  - **Timer Issue**: Fixed timer property mismatch - database uses `duration` field but frontend was accessing `timeLimit`
  - **Fill-in-Blank Questions**: Enhanced answer handling to properly support array-based answers for multiple blanks
  - **Answer Saving**: Improved answer formatting in submission to handle different question types correctly
  - **Attempts Display**: Updated getExamStatus function to include attempts information and display remaining attempts on exam cards
  - **Progress Restoration**: Fixed timer preservation when loading saved progress to prevent restart
  - **Auto-Save Integration**: Enhanced auto-save functionality to work properly with timer and all question types

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
- **Questions**: Exam bank with support for multiple question types (multiple choice, short answer, essay, fill-in-blank)
- **Exams**: Exam metadata including settings, scheduling, and configuration
- **Exam Questions**: Junction table linking exams to questions with order and points
- **Submissions**: Student exam submissions with completion tracking
- **Answers**: Individual answer records for each question in a submission
- **Sessions**: Session storage for authentication

### Exam Bank Management
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
- Percentage-based grading system with real-time calculation
- Real-time grade calculation and display in instructor grading interface
- Per-subject grade calculations for comprehensive course management

### Role-Based Access Control
- **Instructors**: Full access to question creation, exam management, grading, and analytics
- **Students**: Access to assigned exams, submission history, and grade viewing
- Session-based authentication with automatic session management

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit OpenID Connect, sessions are stored in PostgreSQL
2. **Question Creation**: Instructors create questions that are stored in the exam bank for reuse
3. **Exam Creation**: Instructors select questions from the exam bank to create exams with specific configurations
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