import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatSubmissionTime, formatSubmissionDuration, formatDetailedSubmissionTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  MessageSquare,
  Calendar,
  Award,
  Clock
} from "lucide-react";

export default function StudentGrades() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

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

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
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

  // Process submissions with exam details
  const gradesData = submissions?.map((submission: any) => {
    const exam = exams?.find((e: any) => e.id === submission.examId);
    return {
      ...submission,
      exam,
    };
  }).filter((item: any) => item.exam) || [];

  // Calculate statistics
  const completedGrades = gradesData.filter((g: any) => g.totalScore !== null);
  const totalScore = completedGrades.reduce((sum: number, g: any) => sum + parseFloat(g.totalScore || '0'), 0);
  const totalMaxScore = completedGrades.reduce((sum: number, g: any) => sum + parseFloat(g.maxScore || '0'), 0);
  const overallAverage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreColorBg = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 65) return 'D';
    return 'F';
  };

  const getTrendIcon = (currentScore: number, previousScore?: number) => {
    if (!previousScore) return <Minus className="h-4 w-4 text-gray-400" />;
    if (currentScore > previousScore) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (currentScore < previousScore) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Grades & Feedback</h2>
              <p className="text-gray-600 mt-1">View your exam results and instructor feedback</p>
            </div>

            {/* Grade Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overall Average</p>
                      <p className={`text-2xl font-bold ${getScoreColor(overallAverage)}`}>
                        {overallAverage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {getLetterGrade(overallAverage)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Star className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Exams</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {completedGrades.length}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        of {gradesData.length} total
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Highest Score</p>
                      <p className="text-2xl font-bold text-green-600">
                        {completedGrades.length > 0 ? 
                          Math.max(...completedGrades.map((g: any) => 
                            getScorePercentage(g.totalScore, g.maxScore)
                          )).toFixed(1) : 0
                        }%
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Results</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {gradesData.filter((g: any) => g.status === 'submitted').length}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        awaiting grading
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grade History */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Grade History</CardTitle>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-6 border border-gray-200 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : gradesData.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No grades yet</p>
                    <p className="text-gray-400">Complete an exam to see your grades here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gradesData.map((grade: any, index: number) => {
                      const percentage = grade.totalScore ? 
                        getScorePercentage(grade.totalScore, grade.maxScore) : null;
                      const previousGrade = index < gradesData.length - 1 ? gradesData[index + 1] : null;
                      const previousPercentage = previousGrade?.totalScore ? 
                        getScorePercentage(previousGrade.totalScore, previousGrade.maxScore) : null;

                      return (
                        <div key={grade.id} className="border rounded-lg p-6 hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{grade.exam?.title}</h3>
                                {percentage !== null && (
                                  <Badge className={getScoreColorBg(percentage)}>
                                    {getLetterGrade(percentage)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{grade.exam?.subject}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {grade.submittedAt ? 
                                    `Completed: ${formatSubmissionTime(grade.submittedAt)}` : 
                                    grade.startedAt ? 
                                      `Started: ${formatSubmissionTime(grade.startedAt)}` :
                                      'In Progress'
                                  }
                                </span>
                                {grade.startedAt && grade.submittedAt && (
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Duration: {formatSubmissionDuration(grade.startedAt, grade.submittedAt)}
                                  </span>
                                )}
                                {grade.exam?.duration && (
                                  <span>Time Limit: {grade.exam.duration} min</span>
                                )}
                                {grade.isLate && (
                                  <span className="text-red-500 font-medium">Late Submission</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {grade.totalScore ? (
                                <div>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className={`text-2xl font-bold ${getScoreColor(percentage || 0)}`}>
                                      {formatScore(grade.totalScore, grade.maxScore)}
                                    </span>
                                    {getTrendIcon(percentage || 0, previousPercentage || undefined)}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-lg font-medium ${getScoreColor(percentage || 0)}`}>
                                      {percentage?.toFixed(1)}%
                                    </span>
                                  </div>
                                  <Progress value={percentage || 0} className="w-24 h-2 mt-2" />
                                </div>
                              ) : (
                                <div className="text-center">
                                  <Badge variant="secondary">
                                    {grade.status === 'submitted' ? 'Pending' : 
                                     grade.status === 'in_progress' ? 'In Progress' : 
                                     'Unknown'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Detailed Time Information for Completed Exams */}
                          {grade.submittedAt && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600 font-medium mb-1">Started</p>
                                  <p className="text-gray-900">
                                    {grade.startedAt ? formatDetailedSubmissionTime(grade.startedAt) : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium mb-1">Completed</p>
                                  <p className="text-gray-900">
                                    {formatDetailedSubmissionTime(grade.submittedAt)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium mb-1">Time Used</p>
                                  <p className="text-gray-900">
                                    {grade.startedAt ? 
                                      `${formatSubmissionDuration(grade.startedAt, grade.submittedAt)}` + 
                                      (grade.exam?.duration ? ` of ${grade.exam.duration} min` : '') :
                                      'N/A'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Feedback Section - placeholder for when feedback is available */}
                          {grade.status === 'graded' && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-start space-x-3">
                                <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900 mb-1">Instructor Feedback</p>
                                  <p className="text-sm text-gray-600">
                                    Good work overall. Pay attention to the calculation steps in questions 3-5.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Insights */}
            {completedGrades.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="mb-2">
                        <TrendingUp className="h-8 w-8 text-green-500 mx-auto" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">Improving</h4>
                      <p className="text-sm text-gray-600">
                        Your recent scores show improvement over time
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="mb-2">
                        <Star className="h-8 w-8 text-blue-500 mx-auto" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">Consistent</h4>
                      <p className="text-sm text-gray-600">
                        You maintain steady performance across subjects
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="mb-2">
                        <Award className="h-8 w-8 text-orange-500 mx-auto" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">Goal Oriented</h4>
                      <p className="text-sm text-gray-600">
                        Keep up the excellent work to reach your targets
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
