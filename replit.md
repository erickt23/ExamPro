# EduExam Pro - Comprehensive Exam Generator System

## Overview

EduExam Pro is a full-stack web application for creating, managing, and grading exams. It supports role-based access for instructors and students, enabling comprehensive exam management, flexible configuration, and automated grading. The system aims to provide an efficient and robust platform for educational assessment.

## User Preferences

Preferred communication style: Simple, everyday language.
Navigation terminology preferences:
- "Exam Questions" → "Exam Bank" (under Exam Management accordion)
- "Homework Questions" → "Assignment Bank" (under Assignment Management accordion)
- "Homework Assignment" → "Assignments" (under Assignment Management accordion)
- "Exams" → "Exams" (under Exam Management accordion)
- Applied vibrant gradient styling system across all primary action buttons
- Consistent blue-to-indigo gradients with hover effects and scaling animations
- Updated all page titles to match new menu names for consistency
- Renamed "Question Bank" to "Exam Bank" across all translations and components
- Enhanced French and Haitian Creole translation coverage for Assignment Bank interface
- Added comprehensive navigation translations with proper multi-language sidebar support
- Implemented comprehensive Dark Mode functionality with theme context and localStorage persistence
- Applied Twitter (Web) dark mode color template for consistent, professional styling
- Colors: Background (#15202B), Card (#192734), Hover (#22303C), Primary Text (#FFFFFF), Secondary Text (#8899A6)
- Updated all major components (dashboard, sidebar, navbar) with dark mode variants
- Theme toggle integrated into navbar with full translation support
- Students can now retake exams until all attempts are exhausted
- Enhanced status labels to show remaining attempts information for better user experience
- Save Progress Functionality for both exams and homework assignments
- Auto-save functionality every 30 seconds during active work
- Manual "Save Progress" buttons
- Progress restoration when students return to incomplete assignments
- Enhanced exam status system to recognize and display "Resume Exam" for in-progress submissions
- Updated Excel import functionality to support all question types: multiple_choice, short_answer, essay, fill_blank, matching, ranking, drag_drop
- Enhanced server-side validation to properly parse complex question formats (JSON for matching/ranking, pipe-separated for fill_blank)
- Implemented duplicate prevention system for question imports
- Students can now properly access and take exams without page not found errors
- Enhanced question types for exams and exam creation
- Automatic points calculation based on selected questions
- Visual points indicators and summary cards in exam creation interface
- Enhanced question selection with visual feedback
- Enhanced Drag-and-Drop functionality with support for multiple items per zone
- Automatic Grading System Enhancement for all question types including matching, drag-and-drop, fill-in-blank, and ranking
- Partial credit calculation for complex question types
- Drag-Drop Correct Answer Configuration
- Smart Answer Comparison with case-insensitive matching and JSON parsing
- **Enhanced Auto-Grader for Drag-and-Drop and Matching Questions** (August 22, 2025):
  - **Comprehensive Answer Key Storage**: Properly structured JSON format for storing correct answers in both question types
  - **Drag-and-Drop Grading**: Each question has slots (targets) with exactly one correct item per slot, supports zone-based scoring
  - **Matching Question Grading**: Each left-hand item has exactly one correct right-hand match, supports partial credit per pair
  - **Student Response Recording**: Consistent mapping format (slot → answer, left → right) with multiple format support
  - **Advanced Partial Credit System**: Fair scoring based on correct answers vs total items with detailed breakdown
  - **Flexible Data Format Support**: Handles JSON arrays, objects, and key-value mappings for robust answer processing
  - **Enhanced Error Handling**: Comprehensive try-catch blocks with detailed logging for troubleshooting complex question types
  - **Testing API Endpoint**: `/api/admin/test-grading` for validating grading logic with real answer key scenarios
- **Fill-in-the-Blank Manual Grading Policy** (August 22, 2025):
  - **All fill-in-the-blank questions require manual grading** regardless of whether correct answers are set
  - **Submissions with fill-blank questions are marked as "pending"** and appear in instructor grading interface
  - **No auto-grading for fill-blank questions** to ensure human judgment for contextual answers

## System Architecture

### Frontend Architecture
The frontend is a React 18 application built with TypeScript and Vite. It leverages a component-based architecture for modularity and reusability.
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS with shadcn/ui for UI components
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod for validation
- **Authentication**: Session-based authentication

### Backend Architecture
The backend is a RESTful API built with Express.js and TypeScript.
- **Framework**: Express.js with TypeScript
- **Authentication**: Replit OpenID Connect integration with session management
- **Database Access**: Drizzle ORM for type-safe operations
- **Session Storage**: PostgreSQL-based session storage using `connect-pg-simple`
- **API Design**: Resource-based endpoints with standard HTTP practices

### Key Components
- **Database Schema**: PostgreSQL with entities for Users, Questions, Exams, Submissions, and Answers.
- **Exam Bank Management**: Supports various question types, difficulty levels, Bloom's Taxonomy classification, and question reusability.
- **Exam System**: Configurable exams with time limits, attempts, randomization, password protection, scheduling, and auto/manual grading.
- **Final Grade Calculation System**: Configurable weighted grading system (default 40% Assignment, 60% Exam) with real-time calculation, per-subject grading.
- **Role-Based Access Control**: Differentiates access for Instructors (full management, grading, analytics) and Students (exam taking, submission history, grade viewing).

### Data Flow
1. **Authentication**: Users authenticate via Replit OpenID Connect; sessions are stored in PostgreSQL.
2. **Question/Exam Creation**: Instructors manage questions in the exam bank and create exams.
3. **Exam Taking**: Students access and submit exams, with progress tracking.
4. **Grading**: Objective questions are auto-graded; subjective questions are manually graded.
5. **Analytics**: Real-time statistics and performance tracking for instructors.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitives
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **openid-client**: OpenID Connect client
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **tailwindcss**: CSS framework
- **shadcn/ui**: Pre-built UI components
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management