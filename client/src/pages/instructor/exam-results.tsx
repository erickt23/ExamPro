import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatSubmissionTime, formatDetailedSubmissionTime } from "@/lib/dateUtils";
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
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);

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

  const formatAnswer = (answer: any, questionType: string): React.ReactNode => {
    if (!answer || answer === '') return 'No answer provided';
    
    try {
      switch (questionType) {
        case 'multiple_choice':
          return answer;
        case 'short_answer':
        case 'essay':
          return answer;
        case 'fill_blank':
          if (typeof answer === 'string') {
            return answer.split('|').map((ans: string, i: number) => (
              <span key={i} className="inline-block bg-blue-100 dark:bg-blue-800/20 px-2 py-1 rounded mr-2 mb-1">
                Blank {i + 1}: {ans.trim()}
              </span>
            ));
          }
          return answer;
        case 'matching':
          if (typeof answer === 'string') {
            try {
              const parsed = JSON.parse(answer);
              if (typeof parsed === 'object' && parsed !== null) {
                return Object.entries(parsed).map(([left, right], i) => (
                  <div key={i} className="text-sm mb-1">
                    <span className="font-medium">{left}</span> → <span>{right}</span>
                  </div>
                ));
              }
            } catch (e) {
              // Fallback for malformed JSON
              return answer;
            }
          }
          return 'Invalid answer format';
        case 'ranking':
          if (typeof answer === 'string') {
            try {
              const parsed = JSON.parse(answer);
              if (Array.isArray(parsed)) {
                return parsed.map((item, i) => (
                  <span key={i} className="inline-block bg-purple-100 dark:bg-purple-800/20 px-2 py-1 rounded mr-2 mb-1">
                    {i + 1}. {item}
                  </span>
                ));
              }
            } catch (e) {
              return answer;
            }
          }
          return answer;
        case 'drag_drop':
          if (typeof answer === 'string') {
            try {
              const parsed = JSON.parse(answer);
              if (typeof parsed === 'object' && parsed !== null) {
                return Object.entries(parsed).map(([zone, item], i) => (
                  <div key={i} className="text-sm mb-1">
                    <span className="font-medium">{zone}:</span> <span>{item}</span>
                  </div>
                ));
              }
            } catch (e) {
              return answer;
            }
          }
          return 'Invalid answer format';
        default:
          return answer;
      }
    } catch (error) {
      return 'Error displaying answer';
    }
  };

  const SubmissionCard = ({ submission }: { submission: any }) => {
    const isExpanded = expandedSubmission === submission.id;
    
    return (
      <Card className="border-l-4 border-l-blue-500 dark:bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/20 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-foreground">{submission.studentName || 'Student'}</h4>
                <p className="text-sm text-gray-500 dark:text-muted-foreground">
                  {formatSubmissionTime(submission.submittedAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeColor(submission.status)}>
                {submission.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedSubmission(isExpanded ? null : submission.id)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {submission.score !== null ? Math.round(submission.score) : 'N/A'}%
              </div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground">Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {submission.timeSpent ? formatTime(submission.timeSpent) : 'N/A'}
              </div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground">Time Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {submission.answers?.length || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground">Answers</div>
            </div>
          </div>

          {isExpanded && submission.answers && (
            <div className="space-y-4 border-t pt-4">
              <h5 className="font-semibold text-gray-900 dark:text-foreground">Answer Details</h5>
              {submission.answers.map((answer: any, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700 dark:text-muted-foreground">
                      Question {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {answer.isCorrect !== undefined && (
                        <Badge className={answer.isCorrect 
                          ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400" 
                          : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
                        }>
                          {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                      )}
                      {answer.points !== undefined && (
                        <span className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
                          {answer.points} pts
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-muted-foreground">
                    <div className="mb-1 font-medium">Answer:</div>
                    <div className="bg-white dark:bg-background/50 p-2 rounded border">
                      {formatAnswer(answer.answer, answer.questionType)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-8">
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

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
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
            </TabsContent>

            <TabsContent value="submissions" className="space-y-6">
              {submissions.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                    Student Submissions ({submissions.length})
                  </h3>
                  {submissions.map((submission: any) => (
                    <SubmissionCard key={submission.id} submission={submission} />
                  ))}
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
    </div>
  );
}