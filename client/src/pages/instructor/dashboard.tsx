import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatSubmissionTime, formatDetailedSubmissionTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  FileText, 
  Users, 
  Clock,
  TrendingUp,
  ArrowUp,
  AlertCircle,
  Eye,
  CheckCircle2
} from "lucide-react";
import { Link } from "wouter";

export default function InstructorDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('auth.unauthorized'),
        description: t('auth.loggedOut'),
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

  // Fetch homework assignments
  const { data: homeworkAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/homework"],
    retry: false,
  });

  // Fetch pending submissions for grading
  const { data: pendingSubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/submissions", { status: "pending" }],
    queryFn: async () => {
      const response = await fetch('/api/submissions?status=pending');
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  // Fetch completed submissions
  const { data: completedSubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/submissions", { status: "graded" }],
    queryFn: async () => {
      const response = await fetch('/api/submissions?status=graded');
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  // Fetch pending homework submissions for grading
  const { data: pendingHomeworkSubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/homework-submissions", { status: "submitted" }],
    queryFn: async () => {
      const response = await fetch('/api/homework-submissions?status=submitted');
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
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
              <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h2>
              <p className="text-gray-600 mt-1">{t('dashboard.description')}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.totalQuestions')}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : (stats as any)?.totalQuestions || 0}
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
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.activeExams')}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : (stats as any)?.activeExams || 0}
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
                        {statsLoading ? "..." : (stats as any)?.totalStudents || 0}
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
                        {(pendingSubmissions.length || 0) + (pendingHomeworkSubmissions.length || 0)}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  ) : (recentExams as any)?.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No exams created yet</p>
                  ) : (
                    <div className="space-y-4">
                      {(recentExams as any)?.slice(0, 3).map((exam: any) => (
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
                  <CardDescription>Exam and homework submissions requiring manual grading</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingSubmissions.length === 0 && pendingHomeworkSubmissions.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending submissions</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Exam Submissions */}
                      {pendingSubmissions
                        .slice(0, 3)
                        .map((submission: any) => {
                          // Find the corresponding exam
                          const exam = (recentExams as any)?.find((e: any) => e.id === submission.examId);
                          return (
                            <div key={`exam-${submission.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{exam?.title || 'Unknown Exam'}</p>
                                  <Badge variant="outline" className="text-xs">Exam</Badge>
                                </div>
                                <p className="text-xs text-gray-600">
                                  Student ID: {submission.studentId} • Submitted: {formatSubmissionTime(submission.submittedAt)}
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
                      
                      {/* Homework Submissions */}
                      {pendingHomeworkSubmissions
                        .slice(0, 3)
                        .map((submission: any) => {
                          // Find the corresponding homework
                          const homework = homeworkAssignments?.find((h: any) => h.id === submission.homeworkId);
                          return (
                            <div key={`homework-${submission.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{homework?.title || 'Unknown Homework'}</p>
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Homework</Badge>
                                </div>
                                <p className="text-xs text-gray-600">
                                  Student ID: {submission.studentId} • Submitted: {formatSubmissionTime(submission.submittedAt)}
                                </p>
                              </div>
                              <Link href={`/homework-grading/${submission.id}`}>
                                <button className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  Grade
                                </button>
                              </Link>
                            </div>
                          );
                        })}
                      
                      {(pendingSubmissions.length + pendingHomeworkSubmissions.length) > 6 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          +{(pendingSubmissions.length + pendingHomeworkSubmissions.length) - 6} more pending
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Completed Exams Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Completed Exams
                  </CardTitle>
                  <CardDescription>Recently completed student submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {completedSubmissions.length === 0 ? (
                    <p className="text-gray-500 text-sm">No completed submissions yet</p>
                  ) : (
                    <div className="space-y-3">
                      {completedSubmissions
                        .slice(0, 5)
                        .map((submission: any) => {
                          // Find the corresponding exam and subject
                          const exam = (recentExams as any)?.find((e: any) => e.id === submission.examId);
                          const subject = (subjects as any[]).find((s: any) => s.id === exam?.subjectId);
                          const percentage = submission.maxScore > 0 ? ((submission.totalScore / submission.maxScore) * 100) : 0;
                          
                          return (
                            <div key={submission.id} className="p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-gray-900">{exam?.title || 'Unknown Exam'}</p>
                                  <p className="text-xs text-gray-600 mt-1">{subject?.name || 'General'}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Completed: {formatDetailedSubmissionTime(submission.submittedAt)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {submission.totalScore}/{submission.maxScore}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {completedSubmissions.length > 5 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          +{completedSubmissions.length - 5} more completed
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
