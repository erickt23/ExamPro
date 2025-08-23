import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatSubmissionTime, formatDetailedSubmissionTime } from "@/lib/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronUp
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface ExamResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number | null;
}

export default function ExamResultsModal({ open, onOpenChange, examId }: ExamResultsModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);

  // Fetch exam details
  const { data: examData } = useQuery({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      if (!examId) return null;
      const response = await fetch(`/api/exams/${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  // Fetch exam analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics/exam", examId],
    queryFn: async () => {
      if (!examId) return null;
      const response = await fetch(`/api/analytics/exam/${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  // Fetch submissions for this exam
  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/submissions", { examId }],
    queryFn: async () => {
      if (!examId) return [];
      const response = await fetch(`/api/submissions?examId=${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  if (!examData) {
    return null;
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Exam Results: {examData.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
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
                      <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.totalSubmissions || 0}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.averageScore ? `${Math.round(analytics.averageScore)}%` : "0%"}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.completionRate ? `${Math.round(analytics.completionRate)}%` : "0%"}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.averageTime ? formatTime(analytics.averageTime) : "0m"}
                      </p>
                    </div>
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exam Information */}
            <Card>
              <CardHeader>
                <CardTitle>Exam Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{examData.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Points:</span>
                      <span className="font-medium">{examData.totalPoints} points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attempts Allowed:</span>
                      <span className="font-medium">
                        {examData.attemptsAllowed === -1 ? 'Unlimited' : examData.attemptsAllowed}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusBadgeColor(examData.status)}>
                        {examData.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Show Results:</span>
                      <span className="font-medium">
                        {examData.showResultsImmediately ? 'Immediately' : 'After review'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Randomize Questions:</span>
                      <span className="font-medium">
                        {examData.randomizeQuestions ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Submissions ({submissions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission: any) => (
                      <SubmissionCard 
                        key={submission.id} 
                        submission={submission}
                        isExpanded={expandedSubmission === submission.id}
                        onToggleExpand={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                        getStatusBadgeColor={getStatusBadgeColor}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Score Distribution</h4>
                    <div className="space-y-2">
                      {submissions.filter((s: any) => s.status === 'graded').length === 0 ? (
                        <p className="text-gray-500 text-sm">No graded submissions yet</p>
                      ) : (
                        <div className="space-y-2">
                          {['90-100%', '80-89%', '70-79%', '60-69%', 'Below 60%'].map((range, index) => {
                            const gradedSubmissions = submissions.filter((s: any) => s.status === 'graded');
                            let count = 0;
                            
                            gradedSubmissions.forEach((s: any) => {
                              const percentage = (s.totalScore / s.maxScore) * 100;
                              if (index === 0 && percentage >= 90) count++;
                              else if (index === 1 && percentage >= 80 && percentage < 90) count++;
                              else if (index === 2 && percentage >= 70 && percentage < 80) count++;
                              else if (index === 3 && percentage >= 60 && percentage < 70) count++;
                              else if (index === 4 && percentage < 60) count++;
                            });
                            
                            const percentage = gradedSubmissions.length > 0 ? (count / gradedSubmissions.length) * 100 : 0;
                            
                            return (
                              <div key={range} className="flex items-center justify-between">
                                <span className="text-sm">{range}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Status Summary</h4>
                    <div className="space-y-2">
                      {['graded', 'pending', 'submitted'].map((status) => {
                        const count = submissions.filter((s: any) => s.status === status).length;
                        const percentage = submissions.length > 0 ? (count / submissions.length) * 100 : 0;
                        
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusBadgeColor(status)} variant="outline">
                                {status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Separate component for submission cards with expandable answers
function SubmissionCard({ submission, isExpanded, onToggleExpand, getStatusBadgeColor, formatTime }: {
  submission: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  getStatusBadgeColor: (status: string) => string;
  formatTime: (minutes: number) => string;
}) {
  // Fetch submission details with answers when expanded
  const { data: submissionDetails } = useQuery({
    queryKey: ["/api/submissions", submission.id, "grade"],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submission.id}/grade`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: isExpanded,
    retry: false,
  });

  const formatQuestionType = (type: string | undefined) => {
    if (!type) return t('studentExams.unknown');
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getQuestionTypeColor = (type: string | undefined) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800';
      case 'short_answer': return 'bg-green-100 text-green-800';
      case 'essay': return 'bg-orange-100 text-orange-800';
      case 'fill_blank': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Main submission info */}
      <div className="flex items-center justify-between p-4 hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="font-medium">Student ID: {submission.studentId}</p>
            <Badge className={getStatusBadgeColor(submission.status)}>
              {submission.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span>Submitted: {formatSubmissionTime(submission.submittedAt)}</span>
            <span>Time Taken: {formatTime(submission.timeTaken || 0)}</span>
            {submission.startedAt && (
              <span>Started: {formatSubmissionTime(submission.startedAt)}</span>
            )}
            {submission.status === 'graded' && (
              <span className="font-medium text-green-600">
                Score: {submission.totalScore}/{submission.maxScore} 
                ({Math.round((submission.totalScore / submission.maxScore) * 100)}%)
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {submission.status === 'pending' && (
            <button
              onClick={() => window.location.href = `/grading/${submission.id}`}
              className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              Grade
            </button>
          )}
          
          <button
            onClick={onToggleExpand}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Answers
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                View Answers
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded answers section */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-4">
          {!submissionDetails ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading answers...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-3">Questions and Answers</h4>
              {submissionDetails.answers?.map((answer: any, index: number) => (
                <div key={answer.id} className="bg-white p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">Question {index + 1}</span>
                        <Badge className={getQuestionTypeColor(answer.question?.questionType)} variant="outline">
                          {formatQuestionType(answer.question?.questionType)}
                        </Badge>
                      </div>
                      <p className="text-gray-900 font-medium">{answer.question?.questionText}</p>
                    </div>
                    <div className="text-right text-sm">
                      {submission.status === 'graded' && (
                        <span className={`font-medium ${
                          parseFloat(answer.score) === parseFloat(answer.maxScore) 
                            ? 'text-green-600' 
                            : parseFloat(answer.score) > 0 
                            ? 'text-orange-600' 
                            : 'text-red-600'
                        }`}>
                          {answer.score}/{answer.maxScore} pts
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Show correct answer for MCQ */}
                  {answer.question?.questionType === 'multiple_choice' && answer.question?.options && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">Options:</p>
                      <div className="grid grid-cols-1 gap-1">
                        {answer.question.options.map((option: string, optionIndex: number) => {
                          const letter = String.fromCharCode(65 + optionIndex);
                          const isSelected = answer.selectedOption === letter;
                          const isCorrect = answer.question.correctAnswer === letter;
                          return (
                            <div 
                              key={optionIndex} 
                              className={`text-sm p-2 rounded ${
                                isSelected && isCorrect 
                                  ? 'bg-green-100 text-green-800 font-medium' 
                                  : isSelected 
                                  ? 'bg-red-100 text-red-800 font-medium'
                                  : isCorrect
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <span className="font-medium">{letter}.</span> {option}
                              {isSelected && <span className="ml-2">(Selected)</span>}
                              {isCorrect && <span className="ml-2">(Correct)</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Student's answer - show for all question types */}
                  {(answer.answerText || answer.selectedOption || answer.question?.questionType) && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Student's Answer:</p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        {answer.question?.questionType === 'multiple_choice' ? (
                          // Multiple choice - show selected option
                          <div>
                            <span className="font-medium">Selected: </span>
                            <span className={`font-medium ${answer.selectedOption === answer.question.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                              {answer.selectedOption || 'No answer'}
                            </span>
                            {answer.selectedOption !== answer.question.correctAnswer && (
                              <span className="text-gray-500"> (Correct: {answer.question.correctAnswer})</span>
                            )}
                          </div>
                        ) : answer.question?.questionType === 'matching' ? (
                          // Matching - show readable pairs
                          <div className="space-y-2">
                            {(() => {
                              try {
                                // Handle empty or missing answer
                                if (!answer.answerText || answer.answerText.trim() === '' || answer.answerText === '{}') {
                                  return <span className="text-gray-500">No answer provided</span>;
                                }
                                
                                const studentAnswer = typeof answer.answerText === 'string' 
                                  ? JSON.parse(answer.answerText) 
                                  : answer.answerText;
                                
                                // Check if student answer is empty object
                                if (typeof studentAnswer === 'object' && Object.keys(studentAnswer).length === 0) {
                                  return <span className="text-gray-500">No answer provided</span>;
                                }
                                
                                let questionPairs = [];
                                if (answer.question.options) {
                                  const optionsData = typeof answer.question.options === 'string' 
                                    ? JSON.parse(answer.question.options) 
                                    : answer.question.options;
                                  questionPairs = Array.isArray(optionsData) ? optionsData : [];
                                } else if (answer.question.correctAnswer) {
                                  const correctData = typeof answer.question.correctAnswer === 'string'
                                    ? JSON.parse(answer.question.correctAnswer)
                                    : answer.question.correctAnswer;
                                  questionPairs = Array.isArray(correctData) ? correctData : [];
                                }
                                
                                if (questionPairs.length === 0) {
                                  return <span className="text-gray-500">No question pairs available</span>;
                                }
                                
                                return questionPairs.map((pair: any, index: number) => {
                                  const studentSelection = studentAnswer[index] || 'No answer';
                                  return (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <span className="font-medium">{pair.left}</span>
                                      <span className="text-gray-600">→</span>
                                      <span className={`font-medium ${studentSelection === pair.right ? 'text-green-600' : studentSelection === 'No answer' ? 'text-gray-500' : 'text-red-600'}`}>
                                        {studentSelection}
                                      </span>
                                      {studentSelection !== pair.right && studentSelection !== 'No answer' && (
                                        <span className="text-xs text-gray-500">
                                          (Correct: {pair.right})
                                        </span>
                                      )}
                                    </div>
                                  );
                                });
                              } catch (error) {
                                console.error('Error parsing matching answer:', error);
                                return (
                                  <span className="text-gray-500">No answer provided</span>
                                );
                              }
                            })()}
                          </div>
                        ) : answer.question?.questionType === 'drag_drop' ? (
                          // Drag and drop - show zone placements
                          <div className="space-y-1">
                            {(() => {
                              try {
                                if (!answer.answerText) {
                                  return <span className="text-gray-500">No answer provided</span>;
                                }
                                
                                const studentAnswer = typeof answer.answerText === 'string' 
                                  ? JSON.parse(answer.answerText) 
                                  : answer.answerText;
                                
                                // Handle different drag-drop answer formats
                                if (studentAnswer.zones && Array.isArray(studentAnswer.zones)) {
                                  return studentAnswer.zones.map((zone: any, index: number) => (
                                    <div key={index} className="text-xs">
                                      <span className="font-medium">{zone.zone}:</span> {zone.items?.join(', ') || 'No items'}
                                    </div>
                                  ));
                                } else if (typeof studentAnswer === 'object') {
                                  return Object.entries(studentAnswer).map(([item, zone]: [string, any], index: number) => (
                                    <div key={index} className="text-xs">
                                      <span className="font-medium">{item}</span> → {zone}
                                    </div>
                                  ));
                                } else {
                                  return <span>{JSON.stringify(studentAnswer)}</span>;
                                }
                              } catch (error) {
                                console.error('Error parsing drag-drop answer:', error);
                                return <span className="text-red-600">Error displaying answer</span>;
                              }
                            })()}
                          </div>
                        ) : answer.question?.questionType === 'ranking' ? (
                          // Ranking - show ordered list
                          <div>
                            {(() => {
                              try {
                                if (!answer.answerText) {
                                  return <span className="text-gray-500">No answer provided</span>;
                                }
                                
                                const studentOrder = Array.isArray(answer.answerText)
                                  ? answer.answerText
                                  : JSON.parse(answer.answerText || '[]');
                                
                                return (
                                  <ol className="list-decimal list-inside space-y-1">
                                    {studentOrder.map((item: string, index: number) => (
                                      <li key={index} className="text-sm">{item}</li>
                                    ))}
                                  </ol>
                                );
                              } catch (error) {
                                console.error('Error parsing ranking answer:', error);
                                return <span className="text-red-600">Error displaying answer</span>;
                              }
                            })()}
                          </div>
                        ) : answer.question?.questionType === 'fill_blank' ? (
                          // Fill in the blank - show answers
                          <div>
                            {(() => {
                              try {
                                if (!answer.answerText) {
                                  return <span className="text-gray-500">No answer provided</span>;
                                }
                                
                                let studentAnswers;
                                if (typeof answer.answerText === 'string') {
                                  // Try parsing as JSON first, fall back to pipe-separated
                                  try {
                                    studentAnswers = JSON.parse(answer.answerText);
                                  } catch {
                                    studentAnswers = answer.answerText.split('|');
                                  }
                                } else {
                                  studentAnswers = answer.answerText;
                                }
                                
                                if (Array.isArray(studentAnswers)) {
                                  return (
                                    <div className="space-y-1">
                                      {studentAnswers.map((ans: string, index: number) => (
                                        <div key={index} className="text-sm">
                                          <span className="font-medium">Blank {index + 1}:</span> {ans || 'No answer'}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                } else {
                                  return <span>{studentAnswers}</span>;
                                }
                              } catch (error) {
                                console.error('Error parsing fill-blank answer:', error);
                                return <span className="text-red-600">Error displaying answer</span>;
                              }
                            })()}
                          </div>
                        ) : (
                          // Default - show raw answer text for essay, short_answer, etc.
                          answer.answerText || 'No answer provided'
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}