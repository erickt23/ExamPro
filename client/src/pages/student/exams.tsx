import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileText,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Save,
  Upload,
  Link,
  Paperclip,
  Download,
  ExternalLink
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Input } from "@/components/ui/input";

export default function StudentExams() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: any}>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);

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

  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
    retry: false,
  });

  const { data: mySubmissions } = useQuery({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  const { data: examDetails } = useQuery({
    queryKey: ["/api/exams", selectedExam?.id],
    queryFn: async () => {
      const response = await fetch(`/api/exams/${selectedExam.id}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!selectedExam,
    retry: false,
  });

  const submitExamMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      await apiRequest("POST", `/api/exams/${selectedExam.id}/submit`, submissionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Success",
        description: "Exam submitted successfully",
      });
      setSelectedExam(null);
      setAnswers({});
      setTimeRemaining(null);
      setExamStartTime(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to submit exam",
        variant: "destructive",
      });
    },
  });

  // Timer effect
  useEffect(() => {
    if (selectedExam && examStartTime && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            // Auto-submit when time runs out
            handleSubmitExam();
            return 0;
          }
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [selectedExam, examStartTime, timeRemaining]);

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

  const availableExams = (exams as any[])?.filter((exam: any) => {
    const hasSubmission = (mySubmissions as any[])?.some((sub: any) => sub.examId === exam.id);
    const now = new Date();
    const availableFrom = exam.availableFrom ? new Date(exam.availableFrom) : null;
    const availableUntil = exam.availableUntil ? new Date(exam.availableUntil) : null;
    
    const isAvailable = (!availableFrom || now >= availableFrom) && 
                       (!availableUntil || now <= availableUntil);
    
    return exam.status === 'active' && !hasSubmission && isAvailable;
  }) || [];

  const completedExams = (exams as any[])?.filter((exam: any) => {
    return (mySubmissions as any[])?.some((sub: any) => sub.examId === exam.id);
  }) || [];

  const handleStartExam = (exam: any) => {
    setSelectedExam(exam);
    setExamStartTime(new Date());
    setTimeRemaining(exam.duration * 60); // Convert minutes to seconds
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitExam = () => {
    if (!selectedExam || !examStartTime) return;

    const timeTaken = Math.floor((new Date().getTime() - examStartTime.getTime()) / (1000 * 60));
    const submissionAnswers = examDetails?.questions?.map((eq: any) => ({
      questionId: eq.question.id,
      answerText: answers[eq.question.id]?.text || '',
      selectedOption: answers[eq.question.id]?.selectedOption || null,
      attachmentUrl: answers[eq.question.id]?.attachmentUrl || null,
      linkUrl: answers[eq.question.id]?.linkUrl || null,
    })) || [];

    submitExamMutation.mutate({
      answers: submissionAnswers,
      timeTaken,
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds: number, totalDuration: number) => {
    const percentage = (seconds / (totalDuration * 60)) * 100;
    if (percentage > 25) return 'text-green-600';
    if (percentage > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  // If taking an exam, show exam interface
  if (selectedExam && examDetails) {
    const currentQuestion = examDetails.questions?.[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / (examDetails.questions?.length || 1)) * 100;

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          {/* Exam Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedExam.title}</h1>
                <p className="text-gray-600">{selectedExam.subject}</p>
              </div>
              <div className="text-right">
                {timeRemaining !== null && (
                  <div className={`text-2xl font-bold ${getTimeColor(timeRemaining, selectedExam.duration)}`}>
                    <Clock className="inline h-6 w-6 mr-2" />
                    {formatTime(timeRemaining)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {examDetails.questions?.length || 0}
              </div>
              <Progress value={progress} className="w-48 h-2" />
            </div>
          </div>

          {/* Question */}
          {currentQuestion && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline">
                      {currentQuestion.question.questionType.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {currentQuestion.points} points
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {currentQuestion.question.questionText}
                  </h3>
                  
                  {/* Question Attachment */}
                  {currentQuestion.question.attachmentUrl && (
                    <div className="bg-blue-50 p-3 rounded border mb-4">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Question Attachment:</span>
                      </div>
                      <div className="mt-2">
                        <a 
                          href={currentQuestion.question.attachmentUrl.startsWith('/objects/') 
                            ? currentQuestion.question.attachmentUrl 
                            : `/objects/uploads/${currentQuestion.question.attachmentUrl.split('/').pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Download className="h-3 w-3" />
                          Download File
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Answer Input Based on Question Type */}
                {currentQuestion.question.questionType === 'multiple_choice' && (
                  <RadioGroup 
                    value={answers[currentQuestion.question.id]?.selectedOption || ''} 
                    onValueChange={(value) => 
                      handleAnswerChange(currentQuestion.question.id, { selectedOption: value })
                    }
                  >
                    <div className="space-y-3">
                      {currentQuestion.question.options?.map((option: string, index: number) => {
                        const letter = String.fromCharCode(65 + index);
                        return (
                          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                            <RadioGroupItem value={letter} id={`option-${letter}`} />
                            <Label htmlFor={`option-${letter}`} className="flex-1 cursor-pointer">
                              <span className="font-medium mr-2">{letter}.</span>
                              {option}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                )}

                {currentQuestion.question.questionType === 'short_answer' && (
                  <Textarea
                    rows={4}
                    placeholder="Enter your answer here..."
                    value={answers[currentQuestion.question.id]?.text || ''}
                    onChange={(e) => 
                      handleAnswerChange(currentQuestion.question.id, { text: e.target.value })
                    }
                    className="w-full"
                  />
                )}

                {currentQuestion.question.questionType === 'essay' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Written Answer</Label>
                      <Textarea
                        rows={10}
                        placeholder="Enter your essay answer here..."
                        value={answers[currentQuestion.question.id]?.text || ''}
                        onChange={(e) => 
                          handleAnswerChange(currentQuestion.question.id, { 
                            ...answers[currentQuestion.question.id],
                            text: e.target.value 
                          })
                        }
                        className="w-full mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* File Upload Section */}
                      <div>
                        <Label className="text-sm font-medium">Attach File (Optional)</Label>
                        <div className="mt-1">
                          {answers[currentQuestion.question.id]?.attachment ? (
                            <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                              <Paperclip className="h-4 w-4 text-gray-600" />
                              <span className="text-sm truncate">
                                {answers[currentQuestion.question.id].attachment.name}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleAnswerChange(currentQuestion.question.id, {
                                  ...answers[currentQuestion.question.id],
                                  attachment: null,
                                  attachmentUrl: null
                                })}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={50 * 1024 * 1024} // 50MB
                              onGetUploadParameters={async () => {
                                const response = await fetch('/api/objects/upload', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const data = await response.json();
                                return {
                                  method: 'PUT' as const,
                                  url: data.uploadURL
                                };
                              }}
                              onComplete={(result) => {
                                if (result.successful && result.successful.length > 0) {
                                  const file = result.successful[0];
                                  handleAnswerChange(currentQuestion.question.id, {
                                    ...answers[currentQuestion.question.id],
                                    attachment: file.meta,
                                    attachmentUrl: file.uploadURL
                                  });
                                }
                              }}
                              buttonClassName="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload File
                            </ObjectUploader>
                          )}
                        </div>
                      </div>

                      {/* Link Section */}
                      <div>
                        <Label className="text-sm font-medium">Add Link (Optional)</Label>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          value={answers[currentQuestion.question.id]?.linkUrl || ''}
                          onChange={(e) => 
                            handleAnswerChange(currentQuestion.question.id, { 
                              ...answers[currentQuestion.question.id],
                              linkUrl: e.target.value 
                            })
                          }
                          className="mt-1"
                        />
                        {answers[currentQuestion.question.id]?.linkUrl && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <Link className="h-3 w-3" />
                            <span>Link will be submitted with your answer</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentQuestion.question.questionType === 'fill_blank' && (
                  <div className="space-y-3">
                    <Label>Fill in the blank:</Label>
                    <input
                      type="text"
                      placeholder="Your answer..."
                      value={answers[currentQuestion.question.id]?.text || ''}
                      onChange={(e) => 
                        handleAnswerChange(currentQuestion.question.id, { text: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-3">
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Progress
              </Button>
              
              {currentQuestionIndex < (examDetails.questions?.length || 1) - 1 ? (
                <Button 
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmitExam}
                  disabled={submitExamMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitExamMutation.isPending ? 'Submitting...' : 'Submit Exam'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main exams list view
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Exams</h2>
              <p className="text-gray-600 mt-1">View available exams and your completed assessments</p>
            </div>

            {/* Available Exams */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="h-5 w-5 mr-2" />
                  Available Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableExams.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No available exams</p>
                    <p className="text-gray-400">Check back later for new assignments</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableExams.map((exam: any) => (
                      <div key={exam.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">{exam.title}</h3>
                            <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || 'Unknown Subject'}</p>
                          </div>
                          <Badge>Available</Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span>{exam.duration} minutes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Points:</span>
                            <span>{exam.totalPoints}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Attempts:</span>
                            <span>{exam.attemptsAllowed === -1 ? 'Unlimited' : exam.attemptsAllowed}</span>
                          </div>
                          {exam.availableUntil && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Due:</span>
                              <span>{new Date(exam.availableUntil).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <Button 
                          onClick={() => handleStartExam(exam)}
                          className="w-full"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Exam
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Exams */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Completed Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedExams.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No completed exams</p>
                    <p className="text-gray-400">Complete an exam to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedExams.map((exam: any) => {
                      const submission = (mySubmissions as any[])?.find((s: any) => s.examId === exam.id);
                      return (
                        <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{exam.title}</h4>
                            <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || 'Unknown Subject'}</p>
                            {submission?.submittedAt && (
                              <p className="text-xs text-gray-500">
                                Completed: {new Date(submission.submittedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            {submission?.totalScore ? (
                              <div>
                                <p className="font-medium text-gray-900">
                                  {submission.totalScore}/{submission.maxScore}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {((parseFloat(submission.totalScore) / parseFloat(submission.maxScore)) * 100).toFixed(1)}%
                                </p>
                              </div>
                            ) : (
                              <Badge variant="secondary">
                                {submission?.status?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
