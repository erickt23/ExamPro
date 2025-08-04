import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatSubmissionTime, formatSubmissionDuration, getExamStatus, formatEasternTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Play
} from "lucide-react";

export default function StudentDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });

  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ["/api/exams"],
    retry: false,
    refetchInterval: 30000, // Auto-refresh every 30 seconds to check for newly available exams
    refetchIntervalInBackground: true,
  });

  const { data: mySubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/submissions"],
    retry: false,
    refetchInterval: 30000, // Auto-refresh every 30 seconds to check for submission updates
    refetchIntervalInBackground: true,
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

  // Process student stats
  const completedSubmissions = mySubmissions.filter((s: any) => s.status === 'graded');
  const totalScore = completedSubmissions.reduce((sum: number, s: any) => sum + parseFloat(s.totalScore || '0'), 0);
  const totalMaxScore = completedSubmissions.reduce((sum: number, s: any) => sum + parseFloat(s.maxScore || '0'), 0);
  const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  // Categorize exams by status
  const examsByStatus = exams.filter((exam: any) => exam.status === 'active').map((exam: any) => {
    const examStatus = getExamStatus(exam, mySubmissions);
    return { ...exam, examStatus };
  });

  const upcomingExams = examsByStatus.filter((exam: any) => exam.examStatus.status === 'upcoming');
  const availableExams = examsByStatus.filter((exam: any) => exam.examStatus.status === 'available');
  const expiredExams = examsByStatus.filter((exam: any) => exam.examStatus.status === 'expired');
  const allUpcomingAndAvailable = [...upcomingExams, ...availableExams];

  // Get recent submissions
  const recentSubmissions = mySubmissions.slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatScore = (score: string | number, maxScore: string | number) => {
    const s = parseFloat(score?.toString() || '0');
    const m = parseFloat(maxScore?.toString() || '0');
    return `${s.toFixed(1)}/${m}`;
  };

  const getScorePercentage = (score: string | number, maxScore: string | number) => {
    const s = parseFloat(score?.toString() || '0');
    const m = parseFloat(maxScore?.toString() || '0');
    return m > 0 ? (s / m) * 100 : 0;
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'available':
        return { variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-100' };
      case 'upcoming':
        return { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' };
      case 'expired':
        return { variant: 'outline' as const, className: 'bg-red-100 text-red-800 hover:bg-red-100' };
      case 'completed':
        return { variant: 'outline' as const, className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' };
      default:
        return { variant: 'secondary' as const };
    }
  };

  const handleStartExam = (exam: any) => {
    // Navigate to exams page with exam ID as URL parameter
    setLocation(`/exams?start=${exam.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName || 'Student'}!
              </h2>
              <p className="text-gray-600 mt-1">Here's an overview of your academic progress</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {averageScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={averageScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Exams Completed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {completedSubmissions.length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-gray-500">
                      {mySubmissions?.length || 0} total attempts
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available Exams</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {availableExams.length}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-gray-500">
                      {upcomingExams.length} upcoming, {expiredExams.length} expired
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Results</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {mySubmissions?.filter((s: any) => s.status === 'submitted').length || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-gray-500">Awaiting grading</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Exams */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Exams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allUpcomingAndAvailable.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No exams available</p>
                      <p className="text-sm text-gray-400">Check back later for new assignments</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allUpcomingAndAvailable.slice(0, 4).map((exam: any) => (
                        <div key={exam.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{exam.title}</h4>
                              <Badge {...getStatusBadgeProps(exam.examStatus.status)}>
                                {exam.examStatus.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || 'Unknown Subject'} • {exam.duration} minutes</p>
                            {exam.availableFrom && exam.examStatus.status === 'upcoming' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Available: {formatEasternTime(exam.availableFrom, { includeDate: true, includeTime: true, format: 'medium' })}
                              </p>
                            )}
                            {exam.availableUntil && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {formatEasternTime(exam.availableUntil, { includeDate: true, includeTime: true, format: 'medium' })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {exam.examStatus.canStart ? (
                              <Button size="sm" onClick={() => handleStartExam(exam)}>
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {exam.examStatus.status === 'upcoming' ? 'Not yet available' : 'Cannot start'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Recent Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSubmissions.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No results yet</p>
                      <p className="text-sm text-gray-400">Complete an exam to see your results</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentSubmissions.map((submission: any) => (
                        <div key={submission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">Exam {submission.examId}</h4>
                              {submission.isLate && (
                                <Badge variant="destructive" className="text-xs">Late</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {submission.submittedAt ? (
                                <>
                                  <p>Completed: {formatSubmissionTime(submission.submittedAt)}</p>
                                  {submission.startedAt && (
                                    <p className="flex items-center space-x-2">
                                      <Clock className="h-3 w-3" />
                                      <span>Duration: {formatSubmissionDuration(submission.startedAt, submission.submittedAt)}</span>
                                    </p>
                                  )}
                                </>
                              ) : submission.startedAt ? (
                                <p>Started: {formatSubmissionTime(submission.startedAt)}</p>
                              ) : (
                                <p>In Progress</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {submission.totalScore ? (
                              <div className="text-right">
                                <p className="font-medium text-gray-900">
                                  {formatScore(submission.totalScore, submission.maxScore)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {getScorePercentage(submission.totalScore, submission.maxScore).toFixed(1)}%
                                </p>
                              </div>
                            ) : (
                              <Badge className={getStatusColor(submission.status)}>
                                {submission.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            {completedSubmissions.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Highest Score</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.max(...completedSubmissions.map((s: any) => 
                          getScorePercentage(s.totalScore, s.maxScore)
                        )).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Average Score</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {averageScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {mySubmissions?.length ? 
                          ((completedSubmissions.length / mySubmissions.length) * 100).toFixed(1) : 
                          0
                        }%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
      </main>
    </div>
  );
}
