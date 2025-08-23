import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatSubmissionTime, formatDetailedSubmissionTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  BarChart3,
  Users,
  Target,
  Clock,
  TrendingUp,
  Award,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function ExamResults() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);

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
  }, [isAuthenticated, isLoading, toast, t]);

  // Fetch exams for the dropdown
  const { data: exams = [] } = useQuery({
    queryKey: ['/api/exams'],
    queryFn: async () => {
      const response = await fetch('/api/exams');
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  // Fetch exam details
  const { data: examData } = useQuery({
    queryKey: ["/api/exams", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const response = await fetch(`/api/exams/${selectedExamId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!selectedExamId,
    retry: false,
  });

  // Fetch exam analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics/exam", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const response = await fetch(`/api/analytics/exam/${selectedExamId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!selectedExamId,
    retry: false,
  });

  // Fetch submissions for this exam
  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/submissions", { examId: selectedExamId }],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const response = await fetch(`/api/submissions?examId=${selectedExamId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!selectedExamId,
    retry: false,
  });

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400';
      case 'pending': return 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-400';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
    }
  };

  const formatQuestionType = (type: string | undefined) => {
    if (!type) return 'Unknown';
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getQuestionTypeColor = (type: string | undefined) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 'short_answer': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case 'essay': return 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300';
      case 'fill_blank': return 'bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-300';
      case 'matching': return 'bg-pink-100 text-pink-800 dark:bg-pink-800/20 dark:text-pink-300';
      case 'ranking': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800/20 dark:text-indigo-300';
      case 'drag_drop': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-800/20 dark:text-cyan-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
    }
  };

  const formatAnswer = (answer: any, questionType: string): React.ReactNode => {
    // Check for truly empty answers
    if (answer === null || answer === undefined || answer === '') {
      return <span className="text-gray-500 italic">No answer provided</span>;
    }
    
    // Handle empty objects and arrays
    if (typeof answer === 'object' && Object.keys(answer).length === 0) {
      return <span className="text-gray-500 italic">No answer provided</span>;
    }
    
    if (Array.isArray(answer) && answer.length === 0) {
      return <span className="text-gray-500 italic">No answer provided</span>;
    }
    
    // Handle false, 0, and other falsy values that might be valid answers
    if (answer === false || answer === 0) {
      return <span>{String(answer)}</span>;
    }
    
    try {
      switch (questionType) {
        case 'multiple_choice':
          return <span>{String(answer)}</span>;
        case 'short_answer':
        case 'essay':
          return <span>{String(answer)}</span>;
        case 'fill_blank':
          if (typeof answer === 'string') {
            return answer.split('|').map((ans: string, i: number) => (
              <span key={i} className="inline-block bg-blue-100 dark:bg-blue-800/20 px-2 py-1 rounded mr-2 mb-1">
                Blank {i + 1}: {ans.trim()}
              </span>
            ));
          }
          if (Array.isArray(answer)) {
            return answer.map((ans: string, i: number) => (
              <span key={i} className="inline-block bg-blue-100 dark:bg-blue-800/20 px-2 py-1 rounded mr-2 mb-1">
                Blank {i + 1}: {ans}
              </span>
            ));
          }
          return <span>{String(answer)}</span>;
        case 'matching':
          // Helper function to extract text from objects
          const extractText = (item: any): string => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (typeof item === 'object') {
              // Try common text properties
              return item.text || item.label || item.name || item.value || item.content || String(item);
            }
            return String(item);
          };

          // Handle string JSON
          if (typeof answer === 'string') {
            try {
              const parsed = JSON.parse(answer);
              // Handle array format like [{"left":"Mer","right":"Requin"}]
              if (Array.isArray(parsed)) {
                return parsed.map((pair: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{extractText(pair.left)}</span>
                    <span>→</span>
                    <span>{extractText(pair.right)}</span>
                  </div>
                ));
              }
              // Handle object format
              if (typeof parsed === 'object' && parsed !== null) {
                return Object.entries(parsed).map(([left, right], i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{extractText(left)}</span>
                    <span>→</span>
                    <span>{extractText(right)}</span>
                  </div>
                ));
              }
            } catch (e) {
              // Try as a simple string mapping like "0:1,1:2"
              if (answer.includes(':')) {
                const pairs = answer.split(',');
                return pairs.map((pair, i) => {
                  const [left, right] = pair.split(':');
                  return (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{extractText(left)}</span>
                      <span>→</span>
                      <span>{extractText(right)}</span>
                    </div>
                  );
                });
              }
              return <span>{String(answer)}</span>;
            }
          }
          // Handle object format
          if (typeof answer === 'object' && answer !== null) {
            return Object.entries(answer).map(([left, right], i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="font-medium">{extractText(left)}</span>
                <span>→</span>
                <span>{extractText(right)}</span>
              </div>
            ));
          }
          // Handle array format
          if (Array.isArray(answer)) {
            return answer.map((pair: any, i: number) => {
              if (typeof pair === 'object' && pair.left && pair.right) {
                return (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{extractText(pair.left)}</span>
                    <span>→</span>
                    <span>{extractText(pair.right)}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <span>{extractText(pair)}</span>
                </div>
              );
            });
          }
          return <span>{String(answer)}</span>;
        case 'ranking':
          if (typeof answer === 'string') {
            try {
              const parsed = JSON.parse(answer);
              if (Array.isArray(parsed)) {
                return parsed.map((item, i) => (
                  <span key={i} className="inline-block bg-purple-100 dark:bg-purple-800/20 px-2 py-1 rounded mr-2 mb-1">
                    {i + 1}. {String(item)}
                  </span>
                ));
              }
            } catch (e) {
              return <span>{String(answer)}</span>;
            }
          }
          if (Array.isArray(answer)) {
            return answer.map((item, i) => (
              <span key={i} className="inline-block bg-purple-100 dark:bg-purple-800/20 px-2 py-1 rounded mr-2 mb-1">
                {i + 1}. {String(item)}
              </span>
            ));
          }
          return <span>{String(answer)}</span>;
        case 'drag_drop':
          if (typeof answer === 'string') {
            try {
              const parsed = JSON.parse(answer);
              if (typeof parsed === 'object' && parsed !== null) {
                return Object.entries(parsed).map(([zone, item], i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{String(zone)}:</span>
                    <span>{String(item)}</span>
                  </div>
                ));
              }
            } catch (e) {
              return <span>{String(answer)}</span>;
            }
          }
          if (typeof answer === 'object' && answer !== null) {
            return Object.entries(answer).map(([zone, item], i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="font-medium">{String(zone)}:</span>
                <span>{String(item)}</span>
              </div>
            ));
          }
          return <span>{String(answer)}</span>;
        default:
          return <span>{String(answer)}</span>;
      }
    } catch (error) {
      return <span className="text-red-500">Error displaying answer</span>;
    }
  };

  const SubmissionItem = ({ submission }: { submission: any }) => {
    const isExpanded = expandedSubmission === submission.id;
    
    // Fetch submission details with answers when expanded
    const { data: submissionDetails, isLoading: detailsLoading, error: detailsError } = useQuery({
      queryKey: ["/api/submissions", submission.id, "grade"],
      queryFn: async () => {
        const response = await fetch(`/api/submissions/${submission.id}/grade`);
        if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
        return response.json();
      },
      enabled: isExpanded,
      retry: false,
    });
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <div className="py-4 px-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-foreground">
                    Student ID: {submission.studentId}
                  </span>
                </div>
                <Badge className={getStatusBadgeColor(submission.status)}>
                  {submission.status}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-muted-foreground space-x-4">
                <span>
                  Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  }) + ', ' + new Date(submission.submittedAt).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true
                  }) : 'Not submitted'}
                </span>
                <span>Time Taken: {submission.timeTaken ? formatTime(submission.timeTaken) : '0m'}</span>
                <span>
                  Started: {submission.startedAt ? new Date(submission.startedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  }) + ', ' + new Date(submission.startedAt).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true
                  }) : 'N/A'}
                </span>
                <span className="font-medium">
                  Score: <span className="text-green-600 dark:text-green-400">
                    {submission.totalScore !== undefined && submission.maxScore
                      ? `${submission.totalScore}/${submission.maxScore}(${Math.round((submission.totalScore / submission.maxScore) * 100)}%)`
                      : 'N/A'}
                  </span>
                </span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSubmission(isExpanded ? null : submission.id)}
              className="flex items-center gap-2"
            >
              {isExpanded ? 'Hide Answers' : 'View Answers'}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {detailsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">Loading answers...</p>
                </div>
              ) : detailsError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-red-600 dark:text-red-400">Error loading submission details: {detailsError.message}</p>
                </div>
              ) : !submissionDetails ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">No submission details available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 dark:text-foreground">Questions and Answers</h5>
                  {submissionDetails.answers?.map((answer: any, index: number) => (
                    <div key={answer.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900 dark:text-foreground">Question {index + 1}</span>
                          <Badge className={getQuestionTypeColor(answer.question?.questionType)} variant="outline">
                            {formatQuestionType(answer.question?.questionType)}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">
                          {submission.status === 'graded' && (
                            <span className={`${
                              parseFloat(answer.score) === parseFloat(answer.maxScore) 
                                ? 'text-green-600 dark:text-green-400' 
                                : parseFloat(answer.score) > 0 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {answer.score}/{answer.maxScore} pts
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-gray-900 dark:text-foreground">
                        {answer.question?.questionText}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-600 dark:text-muted-foreground mb-2">
                            Student's Answer:
                          </div>
                          <div className="space-y-1">
                            {formatAnswer(answer.answerText || answer.answer || answer.studentAnswer, answer.question?.questionType)}
                          </div>
                        </div>
                        
                        {answer.question?.correctAnswer && (
                          <div>
                            <div className="text-sm font-medium text-gray-600 dark:text-muted-foreground mb-2">
                              Correct Answer:
                            </div>
                            <div className="space-y-1 text-green-700 dark:text-green-300">
                              {formatAnswer(answer.question.correctAnswer, answer.question?.questionType)}
                            </div>
                          </div>
                        )}
                        
                        {submission.status === 'graded' && answer.feedback && (
                          <div>
                            <div className="text-sm font-medium text-gray-600 dark:text-muted-foreground mb-2">
                              Feedback:
                            </div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-800/10 text-blue-800 dark:text-blue-300 rounded text-sm">
                              {answer.feedback}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {(!submissionDetails.answers || submissionDetails.answers.length === 0) && (
                    <p className="text-sm text-gray-600 dark:text-muted-foreground text-center py-4">
                      No answers found for this submission.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

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
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 space-y-6 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t('nav.examResults')}
              </h1>
              <p className="text-gray-600 dark:text-muted-foreground">
                View detailed exam analytics and student performance
              </p>
            </div>
          </div>

          {/* Exam Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Select Exam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedExamId?.toString()} onValueChange={(value) => setSelectedExamId(Number(value))}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose an exam to view results..." />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam: any) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      {exam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedExamId && examData && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
                  Results: {examData.title}
                </h2>
              </div>

              <Tabs defaultValue="submissions" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="submissions" className="space-y-6">
                  {submissions.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                        Student Submissions ({submissions.length})
                      </h3>
                      <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-gray-700">
                        {submissions.map((submission: any) => (
                          <SubmissionItem key={submission.id} submission={submission} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-muted-foreground">No submissions found for this exam.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Total Submissions</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
                          {analytics?.totalSubmissions || 0}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-800/20 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Average Score</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
                          {analytics?.averageScore ? `${Math.round(analytics.averageScore)}%` : "0%"}
                        </p>
                      </div>
                      <div className="p-2 bg-green-100 dark:bg-green-800/20 rounded-lg">
                        <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
                          {analytics?.completionRate ? `${Math.round(analytics.completionRate)}%` : "0%"}
                        </p>
                      </div>
                      <div className="p-2 bg-purple-100 dark:bg-purple-800/20 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Avg. Time</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
                          {analytics?.averageTime ? formatTime(analytics.averageTime) : "0m"}
                        </p>
                      </div>
                      <div className="p-2 bg-orange-100 dark:bg-orange-800/20 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                  </div>

                  {/* Exam Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Exam Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-muted-foreground">Total Points</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-foreground">{examData.totalPoints}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-muted-foreground">Time Limit</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-foreground">
                        {examData.timeLimit ? formatTime(examData.timeLimit) : 'No limit'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-muted-foreground">Questions</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-foreground">{examData.questionIds?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-muted-foreground">Max Attempts</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-foreground">
                        {examData.maxAttempts || 'Unlimited'}
                      </p>
                    </div>
                    </div>
                    </CardContent>
                  </Card>

                  {/* Performance Analytics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Performance Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900 dark:text-foreground">Score Distribution</h4>
                          <div className="space-y-2">
                            {analytics && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-muted-foreground">Highest Score:</span>
                                  <span className="font-semibold text-gray-900 dark:text-foreground">
                                    {analytics.highestScore ? `${analytics.highestScore}%` : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-muted-foreground">Lowest Score:</span>
                                  <span className="font-semibold text-gray-900 dark:text-foreground">
                                    {analytics.lowestScore ? `${analytics.lowestScore}%` : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-muted-foreground">Average Score:</span>
                                  <span className="font-semibold text-gray-900 dark:text-foreground">
                                    {analytics.averageScore ? `${Math.round(analytics.averageScore)}%` : 'N/A'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900 dark:text-foreground">Time Analysis</h4>
                          <div className="space-y-2">
                            {analytics && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-muted-foreground">Average Time:</span>
                                  <span className="font-semibold text-gray-900 dark:text-foreground">
                                    {analytics.averageTime ? formatTime(analytics.averageTime) : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-muted-foreground">Completion Rate:</span>
                                  <span className="font-semibold text-gray-900 dark:text-foreground">
                                    {analytics.completionRate ? `${Math.round(analytics.completionRate)}%` : 'N/A'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

              </Tabs>
            </div>
          )}

          {!selectedExamId && (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-muted-foreground">Select an exam above to view detailed results and analytics.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}