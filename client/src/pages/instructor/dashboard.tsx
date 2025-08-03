import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  FileText, 
  Users, 
  Clock,
  TrendingUp,
  ArrowUp,
  AlertCircle,
  Eye
} from "lucide-react";
import { Link } from "wouter";

export default function InstructorDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/instructor-stats"],
    retry: false,
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });

  const { data: recentExams, isLoading: examsLoading } = useQuery({
    queryKey: ["/api/exams"],
    retry: false,
  });

  // Fetch pending submissions for grading
  const { data: pendingSubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-600 mt-1">Overview of your teaching activities and recent updates</p>
              
              {/* Test Grading Link */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">Test Grading Access:</p>
                <Link href="/grading/4">
                  <Button size="sm" variant="outline">
                    Test Grading Page (Submission #4)
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Questions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.totalQuestions || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">12%</span>
                    <span className="text-gray-500 ml-2">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Exams</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.activeExams || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">3</span>
                    <span className="text-gray-500 ml-2">new this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Students Enrolled</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.totalStudents || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Users className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">8</span>
                    <span className="text-gray-500 ml-2">new students</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.pendingGrading || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <Clock className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <ArrowUp className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-500">5</span>
                    <span className="text-gray-500 ml-2">need attention</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Exams</CardTitle>
                </CardHeader>
                <CardContent>
                  {examsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentExams?.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No exams created yet</p>
                  ) : (
                    <div className="space-y-4">
                      {recentExams?.slice(0, 3).map((exam: any) => (
                        <div key={exam.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{exam.title}</h4>
                            <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || 'Unknown Subject'}</p>
                          </div>
                          <Badge variant={exam.status === 'active' ? 'default' : 'secondary'}>
                            {exam.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Submissions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Pending Submissions
                  </CardTitle>
                  <CardDescription>Submissions requiring manual grading</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingSubmissions.filter((sub: any) => sub.status === 'pending').length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending submissions</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingSubmissions
                        .filter((sub: any) => sub.status === 'pending')
                        .slice(0, 5)
                        .map((submission: any) => {
                          // Find the corresponding exam
                          const exam = recentExams?.find((e: any) => e.id === submission.examId);
                          return (
                            <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{exam?.title || 'Unknown Exam'}</p>
                                <p className="text-xs text-gray-600">
                                  Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Link href={`/grading/${submission.id}`}>
                                <button className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  Grade
                                </button>
                              </Link>
                            </div>
                          );
                        })}
                      {pendingSubmissions.filter((sub: any) => sub.status === 'pending').length > 5 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          +{pendingSubmissions.filter((sub: any) => sub.status === 'pending').length - 5} more pending
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Questions by Type</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Multiple Choice</span>
                            <span className="font-medium">65%</span>
                          </div>
                          <Progress value={65} className="h-2 mt-1" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Short Answer</span>
                            <span className="font-medium">25%</span>
                          </div>
                          <Progress value={25} className="h-2 mt-1" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Essay</span>
                            <span className="font-medium">10%</span>
                          </div>
                          <Progress value={10} className="h-2 mt-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
