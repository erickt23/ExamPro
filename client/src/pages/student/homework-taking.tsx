import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatEasternTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen,
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  AlertCircle
} from "lucide-react";

interface HomeworkQuestion {
  id: number;
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'fill_blank';
  options?: string[];
  correctAnswer?: string;
  points: number;
  order: number;
}

interface HomeworkAssignment {
  id: number;
  title: string;
  description: string;
  dueDate: string | null;
  attemptsAllowed: number;
  showResultsImmediately: boolean;
  subjectId: number;
}

export default function StudentHomeworkTaking() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/homework/:id/take");
  const homeworkId = params?.id ? parseInt(params.id) : null;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);

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

  // Fetch homework assignment details
  const { data: homework, isLoading: homeworkLoading } = useQuery<HomeworkAssignment>({
    queryKey: [`/api/homework/${homeworkId}`],
    enabled: !!homeworkId && isAuthenticated,
  });

  // Fetch homework questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery<HomeworkQuestion[]>({
    queryKey: [`/api/homework/${homeworkId}/questions`],
    enabled: !!homeworkId && isAuthenticated,
  });

  // Fetch existing submission and answers
  const { data: existingData, isLoading: existingDataLoading } = useQuery<{submission: any, answers: any[]}>({
    queryKey: [`/api/homework/${homeworkId}/submission`],
    enabled: !!homeworkId && isAuthenticated,
  });

  // Load existing answers when data is available
  useEffect(() => {
    if (existingData?.answers && questions.length > 0) {
      const existingAnswers: Record<number, string> = {};
      existingData.answers.forEach((answer: any) => {
        existingAnswers[answer.questionId] = answer.answerText || "";
      });
      setAnswers(existingAnswers);
      setExistingSubmission(existingData.submission);
    }
  }, [existingData, questions]);

  // Submit homework mutation
  const submitHomeworkMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      return await apiRequest("POST", `/api/homework/${homeworkId}/submit`, submissionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      queryClient.invalidateQueries({ queryKey: [`/api/homework/${homeworkId}/submission`] });
      toast({
        title: "Success",
        description: existingSubmission ? "Homework resubmitted successfully!" : "Homework submitted successfully!",
      });
      setLocation("/homework");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit homework",
        variant: "destructive",
      });
    },
  });

  // Save progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async (progressData: any) => {
      await apiRequest("POST", `/api/homework/${homeworkId}/save-progress`, progressData);
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

  // Fetch saved progress
  const { data: savedProgress } = useQuery({
    queryKey: [`/api/homework/${homeworkId}/progress`],
    queryFn: async () => {
      const response = await fetch(`/api/homework/${homeworkId}/progress`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!homeworkId && isAuthenticated,
    retry: false,
  });

  // Load saved progress when available
  useEffect(() => {
    if (savedProgress?.hasProgress && questions.length > 0 && !existingData) {
      const progressData = savedProgress.progressData;
      if (progressData) {
        setAnswers(progressData.answers || {});
        setCurrentQuestionIndex(progressData.currentQuestionIndex || 0);
        
        toast({
          title: "Progress Restored",
          description: "Your previous progress has been restored.",
          variant: "default",
        });
      }
    }
  }, [savedProgress, questions, existingData]);

  // Auto-save effect - save progress every 30 seconds
  useEffect(() => {
    if (homeworkId && Object.keys(answers).length > 0) {
      const autoSaveTimer = setInterval(() => {
        handleSaveProgress();
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveTimer);
    }
  }, [homeworkId, answers, currentQuestionIndex]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSaveProgress = () => {
    if (!homeworkId) return;

    saveProgressMutation.mutate({
      answers,
      currentQuestionIndex,
    });
  };

  const handleSubmitHomework = () => {
    if (questions.length === 0) return;

    // Check if all required questions are answered
    const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id].trim() === "");
    
    if (unansweredQuestions.length > 0) {
      toast({
        title: "Incomplete Homework",
        description: `Please answer all questions before submitting. ${unansweredQuestions.length} question(s) remaining.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    const submissionData = {
      answers: questions.map(q => ({
        questionId: q.id,
        answerText: answers[q.id] || "",
      })),
    };

    submitHomeworkMutation.mutate(submissionData);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).filter(qId => answers[parseInt(qId)]?.trim()).length;

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

  if (!homeworkId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Invalid homework assignment</p>
          <Button onClick={() => setLocation("/homework")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Homework
          </Button>
        </div>
      </div>
    );
  }

  if (homeworkLoading || questionsLoading || existingDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading homework...</p>
        </div>
      </div>
    );
  }

  if (!homework || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Homework not found or has no questions</p>
          <Button onClick={() => setLocation("/homework")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Homework
          </Button>
        </div>
      </div>
    );
  }

  const formatQuestionType = (type: string | undefined) => {
    if (!type) return '';
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const renderAnswerInput = (question: HomeworkQuestion) => {
    const value = answers[question.id] || "";

    switch (question.questionType) {
      case 'multiple_choice':
        return (
          <RadioGroup 
            value={value} 
            onValueChange={(val) => handleAnswerChange(question.id, val)}
            className="space-y-3"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'short_answer':
      case 'fill_blank':
        return (
          <Input
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            className="w-full"
          />
        );

      case 'essay':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Write your essay answer here..."
            rows={8}
            className="w-full"
          />
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            rows={4}
            className="w-full"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BookOpen className="h-8 w-8" />
                    {homework.title}
                  </h1>
                  <p className="text-gray-600 mt-1">{homework.description}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/homework")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Homework
                </Button>
              </div>

              {/* Progress and Info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  {homework.dueDate && (
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      Due: {formatEasternTime(homework.dueDate, { includeTime: true, includeDate: true })}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4" />
                    {answeredCount} of {questions.length} answered
                  </span>
                  {existingSubmission && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Editing Attempt #{existingSubmission.attemptNumber}
                    </Badge>
                  )}
                </div>
                <Badge variant="outline">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </Badge>
              </div>

              <Progress value={progress} className="w-full" />
            </div>

            {/* Question Card */}
            {currentQuestion ? (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      Question {currentQuestionIndex + 1}
                      <Badge variant="outline" className="ml-2">
                        {formatQuestionType(currentQuestion.questionType)}
                      </Badge>
                      <Badge variant="outline">
                        {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                    {answers[currentQuestion.id] && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="prose max-w-none">
                    <p className="text-lg leading-relaxed">{currentQuestion.questionText}</p>
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium mb-3 block">Your Answer:</Label>
                    {renderAnswerInput(currentQuestion)}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6">
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading question...</p>
                </CardContent>
              </Card>
            )}

            {/* Navigation and Submit */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleSaveProgress}
                  disabled={saveProgressMutation.isPending}
                  data-testid="button-save-progress"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveProgressMutation.isPending ? 'Saving...' : 'Save Progress'}
                </Button>
                
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitHomework}
                    disabled={isSubmitting || submitHomeworkMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {existingSubmission ? 'Resubmit Homework' : 'Submit Homework'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Question Navigation */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Question Navigator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-2">
                  {questions.map((question, index) => (
                    <Button
                      key={question.id}
                      variant={index === currentQuestionIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`relative ${answers[question.id] ? 'border-green-500' : ''}`}
                    >
                      {index + 1}
                      {answers[question.id] && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}