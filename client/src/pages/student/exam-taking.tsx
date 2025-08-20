import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, Link, useRoute } from "wouter";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft,
  Save,
  Upload,
  Clock,
  FileText,
  AlertCircle
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";

export default function StudentExamTaking() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/exams/:id/take");
  const examId = params?.id ? parseInt(params.id) : null;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: any}>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Redirect if no exam ID
  useEffect(() => {
    if (!examId) {
      setLocation("/exams");
      return;
    }
  }, [examId, setLocation]);

  // Fetch exam details
  const { data: exam, isLoading: examLoading, error: examError } = useQuery({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      const response = await fetch(`/api/exams/${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId,
    retry: false,
  });

  // Fetch exam questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["/api/exams", examId, "questions"],
    queryFn: async () => {
      const response = await fetch(`/api/exams/${examId}/questions`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId,
    retry: false,
  });

  // Check for existing submissions and progress
  const { data: mySubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  // Initialize timer and load saved progress
  useEffect(() => {
    if (exam && questions.length > 0) {
      const submission = mySubmissions.find((s: any) => s.examId === examId && s.status === 'in_progress');
      
      if (submission && submission.progressData) {
        // Load saved progress
        try {
          const savedData = typeof submission.progressData === 'string' 
            ? JSON.parse(submission.progressData) 
            : submission.progressData;
          
          if (savedData.answers) {
            setAnswers(savedData.answers);
          }
          if (savedData.currentQuestionIndex !== undefined) {
            setCurrentQuestionIndex(savedData.currentQuestionIndex);
          }
          
          // Calculate remaining time
          if (submission.timeRemainingSeconds) {
            setTimeRemaining(submission.timeRemainingSeconds);
          } else if (exam.timeLimit && submission.startedAt) {
            const elapsed = Math.floor((Date.now() - new Date(submission.startedAt).getTime()) / 1000);
            const remaining = (exam.timeLimit * 60) - elapsed;
            setTimeRemaining(Math.max(0, remaining));
          }
          
          setExamStartTime(new Date(submission.startedAt));
        } catch (error) {
          console.error("Error loading saved progress:", error);
        }
      } else {
        // Initialize new exam session
        if (exam.timeLimit) {
          setTimeRemaining(exam.timeLimit * 60);
        }
        setExamStartTime(new Date());
      }
    }
  }, [exam, questions, mySubmissions, examId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Auto-save progress
  useEffect(() => {
    if (!exam || questions.length === 0) return;
    
    const autoSaveInterval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        handleSaveProgress();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [answers, exam, questions]);

  const saveProgressMutation = useMutation({
    mutationFn: async (progressData: any) => {
      await apiRequest("POST", `/api/exams/${examId}/save-progress`, progressData);
    },
    onSuccess: () => {
      toast({
        title: "Progress Saved",
        description: "Your exam progress has been saved",
      });
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
      console.error("Save progress error:", error);
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      await apiRequest("POST", `/api/exams/${examId}/submit`, submissionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Success",
        description: "Exam submitted successfully",
      });
      setLocation("/exams");
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
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

  const handleSaveProgress = () => {
    if (saveProgressMutation.isPending) return;
    
    const progressData = {
      answers,
      currentQuestionIndex,
      timeRemainingSeconds: timeRemaining,
      lastSavedAt: new Date().toISOString()
    };

    saveProgressMutation.mutate(progressData);
  };

  const handleSubmitExam = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const submissionData = {
      answers,
      timeRemaining: timeRemaining || 0,
      submittedAt: new Date().toISOString()
    };

    submitExamMutation.mutate(submissionData);
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
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

  const renderQuestion = (question: any) => {
    const answer = answers[question.questionId];

    switch (question.question.questionType) {
      case 'multiple_choice':
        const options = question.question.options || [];
        return (
          <div className="space-y-3">
            <RadioGroup
              value={answer || ''}
              onValueChange={(value) => handleAnswerChange(question.questionId, value)}
            >
              {options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={String.fromCharCode(65 + index)} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {String.fromCharCode(65 + index)}. {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'short_answer':
        return (
          <Input
            placeholder="Enter your answer..."
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
            className="w-full"
          />
        );

      case 'essay':
        return (
          <Textarea
            placeholder="Write your essay response here..."
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
            className="w-full min-h-[200px]"
          />
        );

      case 'fill_blank':
        const correctAnswers = question.question.correctAnswer ? 
          question.question.correctAnswer.split('|') : [];
        const blanks = question.question.questionText.split('____');
        
        return (
          <div className="space-y-4">
            {correctAnswers.map((_: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <Label className="whitespace-nowrap">Blank {index + 1}:</Label>
                <Input
                  placeholder={`Answer for blank ${index + 1}`}
                  value={answer?.[index] || ''}
                  onChange={(e) => {
                    const newAnswer = answer ? [...answer] : [];
                    newAnswer[index] = e.target.value;
                    handleAnswerChange(question.questionId, newAnswer);
                  }}
                />
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-500">Question type "{question.question.questionType}" is not yet supported</p>
          </div>
        );
    }
  };

  if (isLoading || examLoading || questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (examError || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Exam not found</h2>
          <p className="text-muted-foreground mb-4">The exam you're looking for doesn't exist or is not available.</p>
          <Link href="/exams">
            <Button>Back to Exams</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No questions available</h2>
          <p className="text-muted-foreground mb-4">This exam doesn't have any questions yet.</p>
          <Link href="/exams">
            <Button>Back to Exams</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <Navbar />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Exam Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/exams">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Exams
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground dark:text-foreground">{exam.title}</h1>
                    <p className="text-muted-foreground">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {timeRemaining !== null && (
                    <div className={`flex items-center px-3 py-1 rounded-lg ${
                      timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="font-mono">{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSaveProgress} 
                    variant="outline" 
                    size="sm"
                    disabled={saveProgressMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveProgressMutation.isPending ? "Saving..." : "Save Progress"}
                  </Button>
                </div>
              </div>
              
              <Progress value={progress} className="mt-4" />
            </div>

            {/* Question Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Question {currentQuestionIndex + 1}
                  </CardTitle>
                  <Badge variant="secondary">
                    {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <p className="text-lg">{currentQuestion.question.questionText}</p>
                </div>

                {renderQuestion(currentQuestion)}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous Question
              </Button>

              <div className="flex space-x-3">
                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmitExam}
                    disabled={isSubmitting || submitExamMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isSubmitting || submitExamMutation.isPending ? "Submitting..." : "Submit Exam"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    Next Question
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}