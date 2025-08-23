import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocation } from "wouter";
import { formatSubmissionTime, formatSubmissionDuration, getExamStatus, formatEasternTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
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
  Play,
  BookOpen
} from "lucide-react";

export default function StudentDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
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

  // Fetch homework assignments for dashboard
  const { data: homework = [] } = useQuery<any[]>({
    queryKey: ["/api/homework"],
    retry: false,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('studentDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  // Process student stats
  const completedSubmissions = mySubmissions.filter((s: any) => s.status === 'graded');
  const totalScore = completedSubmissions.reduce((sum: number, s: any) => sum + parseFloat(s.totalScore || '0'), 0);
  const totalMaxScore = completedSubmissions.reduce((sum: number, s: any) => sum + parseFloat(s.maxScore || '0'), 0);
  const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  // Get recent pending homework (due within next 7 days or no due date)
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const recentHomework = homework
    .filter((hw: any) => hw.status === 'active')
    .filter((hw: any) => {
      if (!hw.dueDate) return true; // Include homework with no due date
      const dueDate = new Date(hw.dueDate);
      return dueDate > now && dueDate <= next7Days; // Due within next 7 days
    })
    .sort((a: any, b: any) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; // No due date goes to end
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3); // Show only top 3 most urgent

  // Categorize exams by status
  const examStatuses = exams.map((exam: any) => ({
    ...exam,
    examStatus: getExamStatus(exam, mySubmissions, t)
  }));

  const availableExams = examStatuses.filter((exam: any) => exam.examStatus.status === 'available');
  const upcomingExams = examStatuses.filter((exam: any) => exam.examStatus.status === 'upcoming');
  const completedExams = examStatuses.filter((exam: any) => exam.examStatus.status === 'completed');
  const expiredExams = examStatuses.filter((exam: any) => exam.examStatus.status === 'expired');

  const allUpcomingAndAvailable = [...upcomingExams, ...availableExams].sort((a: any, b: any) => {
    if (a.examStatus.status === 'available' && b.examStatus.status === 'upcoming') return -1;
    if (a.examStatus.status === 'upcoming' && b.examStatus.status === 'available') return 1;
    
    const aDate = new Date(a.availableFrom || a.createdAt);
    const bDate = new Date(b.availableFrom || b.createdAt);
    return aDate.getTime() - bDate.getTime();
  });

  // Get recent submissions (last 3 completed ones)
  const recentSubmissions = mySubmissions
    .filter((s: any) => s.status === 'graded' || s.submittedAt)
    .sort((a: any, b: any) => {
      const aDate = new Date(a.submittedAt || a.createdAt);
      const bDate = new Date(b.submittedAt || b.createdAt);
      return bDate.getTime() - aDate.getTime(); // Most recent first
    })
    .slice(0, 3);

  const handleStartExam = (exam: any) => {
    if (exam.examStatus.canStart) {
      setLocation(`/exams/${exam.id}/take`);
    } else {
      toast({
        title: "Cannot Start Exam",
        description: exam.examStatus.status === 'upcoming' ? 'This exam is not yet available' : 'This exam cannot be started',
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'available':
        return { variant: 'default' as const, className: 'bg-green-100 text-green-800' };
      case 'upcoming':
        return { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' };
      case 'completed':
        return { variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' };
      case 'expired':
        return { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' };
      default:
        return { variant: 'secondary' as const };
    }
  };

  // Helper functions for score display
  const formatScore = (score: string | number, maxScore: string | number) => {
    const numScore = parseFloat(score.toString());
    const numMaxScore = parseFloat(maxScore.toString());
    return `${numScore.toFixed(1)}/${numMaxScore.toFixed(1)}`;
  };

  const getScorePercentage = (score: string | number, maxScore: string | number) => {
    const numScore = parseFloat(score.toString());
    const numMaxScore = parseFloat(maxScore.toString());
    return numMaxScore > 0 ? (numScore / numMaxScore) * 100 : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Log dashboard data for debugging
  console.log('Student exam dashboard data:', {
    totalExams: exams.length,
    availableExams: availableExams.length,
    upcomingExams: upcomingExams.length,
    expiredExams: expiredExams.length,
    completedExams: completedExams.length,
    totalSubmissions: mySubmissions.length,
    user: user?.id
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('studentDashboard.title')}</h1>
              <p className="text-gray-600">{t('studentDashboard.welcomeBack')}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('studentDashboard.availableExams')}</p>
                      <p className="text-2xl font-bold text-gray-900">{availableExams.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('studentDashboard.completed')}</p>
                      <p className="text-2xl font-bold text-gray-900">{completedExams.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('studentDashboard.upcoming')}</p>
                      <p className="text-2xl font-bold text-gray-900">{upcomingExams.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('studentDashboard.averageScore')}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {completedSubmissions.length > 0 ? `${averageScore.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-gray-500">{t('studentDashboard.awaitingGrading')}</span>
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
                    {t('studentDashboard.exams')}
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
                            <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || t('unknownSubject')} • {exam.duration} {t('studentDashboard.minutes')}</p>
                            {exam.availableFrom && exam.examStatus.status === 'upcoming' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Available: {formatEasternTime(exam.availableFrom, { includeDate: true, includeTime: true, format: 'medium' })}
                              </p>
                            )}
                            {exam.availableUntil && (
                              <p className="text-xs text-gray-500 mt-1">
                                {t('studentDashboard.due')}: {formatEasternTime(exam.availableUntil, { includeDate: true, includeTime: true, format: 'medium' })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {exam.examStatus.canStart ? (
                              <Button size="sm" onClick={() => handleStartExam(exam)} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                                <Play className="h-4 w-4 mr-1" />
                                {t('studentDashboard.start')}
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

              {/* Recent Homework */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    {t('studentDashboard.recentHomework')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentHomework.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">{t('studentDashboard.noPendingHomework')}</p>
                      <p className="text-sm text-gray-400">{t('studentDashboard.allAssignmentsUpToDate')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentHomework.map((hw: any) => {
                        const subject = (subjects as any[]).find((s: any) => s.id === hw.subjectId);
                        const getDueDateStatus = (dueDate: string | null) => {
                          if (!dueDate) return { color: "bg-blue-100 text-blue-800", text: "No deadline" };
                          const now = new Date();
                          const due = new Date(dueDate);
                          const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
                          
                          if (hoursLeft < 24) {
                            return { color: "bg-red-100 text-red-800", text: "Due today" };
                          } else if (hoursLeft < 48) {
                            return { color: "bg-orange-100 text-orange-800", text: "Due tomorrow" };
                          } else {
                            const daysLeft = Math.ceil(hoursLeft / 24);
                            return { color: "bg-yellow-100 text-yellow-800", text: `${daysLeft} days left` };
                          }
                        };
                        const dueDateStatus = getDueDateStatus(hw.dueDate);
                        
                        return (
                          <div key={hw.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{hw.title}</h4>
                                <Badge className={dueDateStatus.color}>
                                  {dueDateStatus.text}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {subject?.name || t('studentExams.unknownSubject')}
                              </p>
                              {hw.dueDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Due: {formatEasternTime(hw.dueDate, { includeDate: true, includeTime: true, format: 'medium' })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" onClick={() => setLocation(`/homework/${hw.id}/take`)}>
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-4 border-t">
                        <Button variant="outline" onClick={() => setLocation('/homework')} className="w-full">
                          View All Homework
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}