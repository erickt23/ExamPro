import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Input } from "@/components/ui/input";
import { getExamStatus } from "@/lib/dateUtils";

export default function StudentExams() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: any}>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [completedExamsSearch, setCompletedExamsSearch] = useState('');
  const [completedExamsPage, setCompletedExamsPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

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

  const saveProgressMutation = useMutation({
    mutationFn: async (progressData: any) => {
      await apiRequest("POST", `/api/exams/${selectedExam.id}/save-progress`, progressData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Progress saved successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Error saving progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    },
  });

  const { data: savedProgress } = useQuery({
    queryKey: ["/api/exams", selectedExam?.id, "progress"],
    queryFn: async () => {
      const response = await fetch(`/api/exams/${selectedExam.id}/progress`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!selectedExam,
    retry: false,
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

  // Auto-save effect - save progress every 30 seconds
  useEffect(() => {
    if (selectedExam && Object.keys(answers).length > 0) {
      const autoSaveTimer = setInterval(() => {
        handleSaveProgress();
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveTimer);
    }
  }, [selectedExam, answers, currentQuestionIndex, timeRemaining]);

  // Load saved progress when exam is selected
  useEffect(() => {
    if (savedProgress?.hasProgress && selectedExam && !examStartTime) {
      const progressData = savedProgress.progressData;
      if (progressData) {
        setAnswers(progressData.answers || {});
        setCurrentQuestionIndex(progressData.currentQuestionIndex || 0);
        setTimeRemaining(savedProgress.timeRemainingSeconds || selectedExam.duration * 60);
        setExamStartTime(new Date()); // Start timer from now
        
        toast({
          title: "Progress Restored",
          description: "Your previous progress has been restored.",
          variant: "default",
        });
      }
    }
  }, [savedProgress, selectedExam, examStartTime]);

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

  // Categorize all exams by status
  const allExamsWithStatus = exams.filter((exam: any) => exam.status === 'active').map((exam: any) => {
    const examStatus = getExamStatus(exam, mySubmissions, t);
    return { ...exam, examStatus };
  });

  // Filter available and resumable exams (students can start/resume these)
  const availableExams = allExamsWithStatus.filter((exam: any) => 
    exam.examStatus.status === 'available' || exam.examStatus.status === 'in_progress'
  );
  
  // All exams categorized for display
  const upcomingExams = allExamsWithStatus.filter((exam: any) => exam.examStatus.status === 'upcoming');
  const expiredExams = allExamsWithStatus.filter((exam: any) => exam.examStatus.status === 'expired');
  const completedExams = allExamsWithStatus.filter((exam: any) => exam.examStatus.status === 'completed');
  const inProgressExams = allExamsWithStatus.filter((exam: any) => exam.examStatus.status === 'in_progress');

  // Filter completed exams based on search query
  const filteredCompletedExams = completedExams.filter((exam: any) => {
    if (!completedExamsSearch.trim()) return true;
    
    const searchLower = completedExamsSearch.toLowerCase();
    const examTitle = exam.title.toLowerCase();
    const subject = (subjects as any[]).find((s: any) => s.id === exam.subjectId);
    const subjectName = subject?.name.toLowerCase() || '';
    
    return examTitle.includes(searchLower) || subjectName.includes(searchLower);
  });

  // Pagination for completed exams
  const totalCompletedPages = Math.ceil(filteredCompletedExams.length / ITEMS_PER_PAGE);
  const paginatedCompletedExams = filteredCompletedExams.slice(
    (completedExamsPage - 1) * ITEMS_PER_PAGE,
    completedExamsPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCompletedExamsPage(1);
  }, [completedExamsSearch]);

  // Debug: Log all loaded data
  console.log('Student exam dashboard data:', {
    totalExams: exams.length,
    availableExams: availableExams.length,
    inProgressExams: inProgressExams.length,
    upcomingExams: upcomingExams.length,
    expiredExams: expiredExams.length,
    completedExams: completedExams.length,
    totalSubmissions: mySubmissions.length,
    user: user?.id
  });

  // Check for URL parameter to auto-start exam
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const startExamId = urlParams.get('start');
    
    if (startExamId && exams && !selectedExam) {
      const examToStart = availableExams.find((exam: any) => exam.id.toString() === startExamId);
      if (examToStart) {
        console.log('Auto-starting exam from URL parameter:', examToStart);
        handleStartExam(examToStart);
      }
    }
  }, [exams, availableExams, location, selectedExam]);

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'available':
        return { variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-100' };
      case 'in_progress':
        return { variant: 'default' as const, className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' };
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
    if (exam.examStatus.canStart) {
      setLocation(`/exams/${exam.id}/take`);
    } else {
      toast({
        title: t('studentExams.cannotStartExam'),
        description: exam.examStatus.status === 'upcoming' ? t('studentExams.examNotAvailable') : t('studentExams.examCannotStart'),
        variant: "destructive",
      });
    }
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSaveProgress = () => {
    if (!selectedExam) return;

    saveProgressMutation.mutate({
      answers,
      currentQuestionIndex,
      timeRemainingSeconds: timeRemaining,
    });
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
                {t('studentExams.question')} {currentQuestionIndex + 1} {t('studentExams.of')} {examDetails.questions?.length || 0}
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
                      {currentQuestion.points} {t('studentExams.points')}
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
                        <span className="text-sm font-medium text-blue-900">{t('studentExams.questionAttachment')}</span>
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
                          {t('studentExams.downloadFile')}
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
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                        <strong>Instructions:</strong> Fill in each blank with your answer.
                      </p>
                    </div>
                    {currentQuestion.question.correctAnswer?.split('|').map((_: string, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                        <Label className="text-sm font-medium sm:whitespace-nowrap sm:w-24">
                          Blank {index + 1}:
                        </Label>
                        <Input
                          placeholder={`Enter answer for blank ${index + 1}`}
                          value={answers[currentQuestion.question.id]?.[index] || ''}
                          onChange={(e) => {
                            const currentAnswers = Array.isArray(answers[currentQuestion.question.id]) ? 
                              answers[currentQuestion.question.id] : [];
                            const newAnswers = [...currentAnswers];
                            while (newAnswers.length <= index) {
                              newAnswers.push('');
                            }
                            newAnswers[index] = e.target.value;
                            handleAnswerChange(currentQuestion.question.id, newAnswers);
                          }}
                          className="flex-1 text-base"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.question.questionType === 'matching' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                        <strong>Instructions:</strong> Match each item on the left with the correct item on the right.
                      </p>
                    </div>
                    {/* Implementation will match the exam-taking.tsx version */}
                    <p className="text-sm text-gray-600">Matching questions not yet implemented in this interface. Please use the dedicated exam taking page.</p>
                  </div>
                )}

                {(currentQuestion.question.questionType === 'ranking' || currentQuestion.question.questionType === 'drag_drop') && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                        <strong>Instructions:</strong> {currentQuestion.question.questionType === 'ranking' ? 'Rank items in order' : 'Drag and drop items into zones'}.
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">{currentQuestion.question.questionType === 'ranking' ? 'Ranking' : 'Drag and drop'} questions not yet implemented in this interface. Please use the dedicated exam taking page.</p>
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
              <Button 
                variant="outline"
                onClick={handleSaveProgress}
                disabled={saveProgressMutation.isPending}
                data-testid="button-save-progress"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveProgressMutation.isPending ? t('studentExams.saving') : t('studentExams.saveProgress')}
              </Button>
              
              {currentQuestionIndex < (examDetails.questions?.length || 1) - 1 ? (
                <Button 
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                >
                  {t('studentExams.next')}
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmitExam}
                  disabled={submitExamMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitExamMutation.isPending ? t('studentExams.submitting') : t('studentExams.submitExam')}
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
              <h1 className="text-xl font-semibold text-gray-900">{t('nav.exams')}</h1>
              <p className="text-gray-600 mt-1">{t('exams.description')}</p>
            </div>

            {/* All Exams - Available, Upcoming, Expired */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {t('exams.allExams')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allExamsWithStatus.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">{t('studentExams.noExamsAvailable')}</p>
                    <p className="text-gray-400">{t('studentExams.checkBackLater')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Available Exams */}
                    {availableExams.length > 0 && (
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                          <Play className="h-4 w-4 mr-2 text-green-600" />
                          {t('studentExams.availableExams')} ({availableExams.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {availableExams.map((exam: any) => (
                            <div key={exam.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-green-50 border-green-200">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">{exam.title}</h4>
                                  <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || t('studentExams.unknownSubject')}</p>
                                </div>
                                <Badge {...getStatusBadgeProps(exam.examStatus.status)}>
                                  {exam.examStatus.label}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('studentExams.duration')}:</span>
                                  <span>{exam.duration} {t('studentExams.minutes')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('studentExams.totalPoints')}:</span>
                                  <span>{exam.totalPoints}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('studentExams.attempts')}:</span>
                                  <span>
                                    {exam.examStatus.attemptsUsed}/{exam.attemptsAllowed === -1 ? '∞' : exam.attemptsAllowed}
                                    {exam.examStatus.attemptsRemaining > 0 && exam.attemptsAllowed !== -1 && (
                                      <span className="text-green-600 ml-1">
                                        ({exam.examStatus.attemptsRemaining} {t('studentExams.left')})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {exam.availableUntil && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">{t('studentExams.due')}:</span>
                                    <span>{new Date(exam.availableUntil).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>

                              <Button 
                                onClick={() => handleStartExam(exam)}
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                {t('studentExams.startExam')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upcoming Exams */}
                    {upcomingExams.length > 0 && (
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-600" />
                          {t('studentExams.upcomingExams')} ({upcomingExams.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {upcomingExams.map((exam: any) => (
                            <div key={exam.id} className="border rounded-lg p-6 bg-blue-50 border-blue-200">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">{exam.title}</h4>
                                  <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || t('studentExams.unknownSubject')}</p>
                                </div>
                                <Badge {...getStatusBadgeProps(exam.examStatus.status)}>
                                  {exam.examStatus.label}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('studentExams.duration')}:</span>
                                  <span>{exam.duration} {t('studentExams.minutes')}</span>
                                </div>
                                {exam.availableFrom && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Available from:</span>
                                    <span>{new Date(exam.availableFrom).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {exam.availableUntil && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">{t('studentExams.due')}:</span>
                                    <span>{new Date(exam.availableUntil).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="text-center text-gray-500 text-sm">
                                Not yet available
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expired Exams */}
                    {expiredExams.length > 0 && (
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                          {t('studentExams.expiredExams')} ({expiredExams.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {expiredExams.map((exam: any) => (
                            <div key={exam.id} className="border rounded-lg p-6 bg-red-50 border-red-200">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">{exam.title}</h4>
                                  <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || t('studentExams.unknownSubject')}</p>
                                </div>
                                <Badge {...getStatusBadgeProps(exam.examStatus.status)}>
                                  {exam.examStatus.label}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t('studentExams.duration')}:</span>
                                  <span>{exam.duration} {t('studentExams.minutes')}</span>
                                </div>
                                {exam.availableUntil && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Expired on:</span>
                                    <span>{new Date(exam.availableUntil).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="text-center text-red-600 text-sm font-medium">
                                Exam has expired
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Exams */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {t('studentExams.completedExams')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedExams.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">{t('studentExams.noCompletedExams')}</p>
                    <p className="text-gray-400">{t('studentExams.completeExamToSeeHere')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder={t('studentGrades.searchCompletedExams')}
                        value={completedExamsSearch}
                        onChange={(e) => setCompletedExamsSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Search Results Info */}
                    {filteredCompletedExams.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {t('studentGrades.showingResults', {
                          start: (completedExamsPage - 1) * ITEMS_PER_PAGE + 1,
                          end: Math.min(completedExamsPage * ITEMS_PER_PAGE, filteredCompletedExams.length),
                          total: filteredCompletedExams.length
                        })}
                      </div>
                    )}

                    {/* Completed Exams List */}
                    {filteredCompletedExams.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t('studentGrades.noCompletedExamsFound')}</p>
                        <p className="text-gray-400 text-sm">{t('studentGrades.adjustSearchCriteria')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {paginatedCompletedExams.map((exam: any) => {
                          const submission = mySubmissions.find((s: any) => s.examId === exam.id);
                          return (
                            <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{exam.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || t('studentExams.unknownSubject')}</p>
                                {submission?.submittedAt && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    Completed: {new Date(submission.submittedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              
                              <div className="text-right">
                                {submission?.totalScore ? (
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {submission.totalScore}/{submission.maxScore}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {((parseFloat(submission.totalScore) / parseFloat(submission.maxScore)) * 100).toFixed(1)}%
                                    </p>
                                  </div>
                                ) : (
                                  <Badge variant="secondary">
                                    {submission?.status?.replace('_', ' ') || t('studentExams.unknown')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {totalCompletedPages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t('studentGrades.page', { current: completedExamsPage, total: totalCompletedPages })}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCompletedExamsPage(prev => Math.max(1, prev - 1))}
                            disabled={completedExamsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            {t('studentGrades.previous')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCompletedExamsPage(prev => Math.min(totalCompletedPages, prev + 1))}
                            disabled={completedExamsPage === totalCompletedPages}
                          >
                            {t('studentGrades.next')}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
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
