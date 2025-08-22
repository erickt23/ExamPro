import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import InstructorDashboard from "@/pages/instructor/dashboard";
import InstructorQuestions from "@/pages/instructor/questions";
import InstructorHomeworkQuestions from "@/pages/instructor/homework-questions";
import InstructorExams from "@/pages/instructor/exams";
import InstructorGrading from "@/pages/instructor/grading";
import InstructorExamResults from "@/pages/instructor/exam-results";
import InstructorAnalytics from "@/pages/instructor/analytics";
import InstructorStudents from "@/pages/instructor/students";
import InstructorHomework from "@/pages/instructor/homework";
import InstructorSettings from "@/pages/instructor/settings";
import StudentDashboard from "@/pages/student/dashboard";
import StudentHomework from "@/pages/student/homework";
import StudentHomeworkTaking from "@/pages/student/homework-taking";
import StudentExams from "@/pages/student/exams";
import StudentExamTaking from "@/pages/student/exam-taking";
import StudentGrades from "@/pages/student/grades";
import AdminPage from "@/pages/admin";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  const isInstructor = user?.role === 'instructor';

  return (
    <Switch>
      {isInstructor ? (
        <>
          <Route path="/" component={InstructorDashboard} />
          <Route path="/questions" component={InstructorQuestions} />
          <Route path="/homework-questions" component={InstructorHomeworkQuestions} />
          <Route path="/exams" component={InstructorExams} />
          <Route path="/homework" component={InstructorHomework} />
          <Route path="/grading" component={InstructorGrading} />
          <Route path="/grading/:submissionId" component={InstructorGrading} />
          <Route path="/homework-grading/:submissionId" component={InstructorGrading} />
          <Route path="/exam-results" component={InstructorExamResults} />
          <Route path="/analytics" component={InstructorAnalytics} />
          <Route path="/students" component={InstructorStudents} />
          <Route path="/settings" component={InstructorSettings} />
        </>
      ) : (
        <>
          <Route path="/" component={StudentDashboard} />
          <Route path="/homework" component={StudentHomework} />
          <Route path="/homework/:id/take" component={StudentHomeworkTaking} />
          <Route path="/exams" component={StudentExams} />
          <Route path="/exams/:id/take" component={StudentExamTaking} />
          <Route path="/grades" component={StudentGrades} />
        </>
      )}
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="eduexam-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
