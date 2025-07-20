import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import InstructorDashboard from "@/pages/instructor/dashboard";
import InstructorQuestions from "@/pages/instructor/questions";
import InstructorExams from "@/pages/instructor/exams";
import InstructorGrading from "@/pages/instructor/grading";
import InstructorAnalytics from "@/pages/instructor/analytics";
import InstructorStudents from "@/pages/instructor/students";
import StudentDashboard from "@/pages/student/dashboard";
import StudentExams from "@/pages/student/exams";
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
          <Route path="/exams" component={InstructorExams} />
          <Route path="/grading" component={InstructorGrading} />
          <Route path="/analytics" component={InstructorAnalytics} />
          <Route path="/students" component={InstructorStudents} />
        </>
      ) : (
        <>
          <Route path="/" component={StudentDashboard} />
          <Route path="/exams" component={StudentExams} />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
