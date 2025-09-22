import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/exams/:id/take");
  const examId = params?.id ? parseInt(params.id) : null;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: any}>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('examTaking.unauthorized'),
        description: t('examTaking.loggedOutMessage'),
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

  // Password validation is handled server-side via session
  // If we reach this page, the server has already validated access

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
          
          // Use saved time remaining if available, otherwise calculate from start time
          if (submission.timeRemainingSeconds !== null && submission.timeRemainingSeconds !== undefined) {
            setTimeRemaining(submission.timeRemainingSeconds);
          } else if (exam.duration && submission.startedAt) {
            const elapsed = Math.floor((Date.now() - new Date(submission.startedAt).getTime()) / 1000);
            const remaining = (exam.duration * 60) - elapsed;
            setTimeRemaining(Math.max(0, remaining));
          }
          
          setExamStartTime(new Date(submission.startedAt));
        } catch (error) {
          console.error("Error loading saved progress:", error);
          // Fallback to new session
          if (exam.duration) {
            setTimeRemaining(exam.duration * 60);
          } else {
            setTimeRemaining(null);
          }
          setExamStartTime(new Date());
        }
      } else {
        // Initialize new exam session
        if (exam.duration) {
          setTimeRemaining(exam.duration * 60);
        } else {
          setTimeRemaining(null);
        }
        setExamStartTime(new Date());
      }
    }
  }, [exam, questions, mySubmissions, examId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null) return null;
        
        // Show warning when 30 seconds or less remain
        if (prev <= 30 && prev > 1 && !warningShown) {
          setWarningShown(true);
          toast({
            title: t('examTaking.timeWarning'),
            description: t('examTaking.timeWarningMessage', { seconds: prev }),
            variant: "destructive",
          });
        }
        
        if (prev <= 1) {
          // Auto-submit when time runs out
          if (!isSubmitting) {
            toast({
              title: t('examTaking.timeExpired'),
              description: t('examTaking.timeExpiredMessage'),
              variant: "destructive",
            });
            handleSubmitExam();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isSubmitting, warningShown, toast]);

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
        title: t('examTaking.progressSaved'),
        description: t('examTaking.progressSavedMessage'),
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
        title: t('examTaking.success'),
        description: t('examTaking.examSubmittedSuccessfully'),
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
        title: t('examTaking.error'),
        description: t('examTaking.failedToSubmitExam'),
        variant: "destructive",
      });
    },
  });

  const handlePasswordSubmit = () => {
    if (exam && exam.password === enteredPassword) {
      setPasswordRequired(false);
      toast({
        title: t('examTaking.passwordCorrect'),
        description: t('examTaking.accessGranted'),
      });
    } else {
      toast({
        title: t('examTaking.incorrectPassword'),
        description: t('examTaking.passwordIncorrect'),
        variant: "destructive",
      });
      setEnteredPassword('');
    }
  };

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
    
    // Convert answers to the format expected by the server
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => {
      // Find the question to determine its type
      const question = questions?.find((q: any) => q.questionId === parseInt(questionId));
      
      if (Array.isArray(answer)) {
        // Check if this is a multiple choice question with multiple selections
        if (question?.question.questionType === 'multiple_choice') {
          return {
            questionId: parseInt(questionId),
            answerText: JSON.stringify(answer), // Keep for backward compatibility
            selectedOption: null,
            selectedOptions: answer, // Store the array of selected options
            attachmentUrl: null,
            linkUrl: null,
          };
        } else {
          // For fill_blank questions, answer is an array
          return {
            questionId: parseInt(questionId),
            answerText: JSON.stringify(answer),
            selectedOption: null,
            attachmentUrl: null,
            linkUrl: null,
          };
        }
      } else if (typeof answer === 'object' && answer !== null) {
        // Check if this is a matching question answer (object with numeric keys)
        const hasNumericKeys = Object.keys(answer).some(key => !isNaN(Number(key)));
        if (hasNumericKeys) {
          // For matching questions, answer is an object like {0: "option1", 1: "option2"}
          return {
            questionId: parseInt(questionId),
            answerText: JSON.stringify(answer),
            selectedOption: null,
            attachmentUrl: null,
            linkUrl: null,
          };
        } else {
          // For other question types with object structure (like essay with attachments)
          return {
            questionId: parseInt(questionId),
            answerText: answer.text || '',
            selectedOption: answer.selectedOption || null,
            attachmentUrl: answer.attachmentUrl || null,
            linkUrl: answer.linkUrl || null,
          };
        }
      } else {
        // For simple string answers (multiple choice, etc.)
        return {
          questionId: parseInt(questionId),
          answerText: answer || '',
          selectedOption: answer || null,
          attachmentUrl: null,
          linkUrl: null,
        };
      }
    });
    
    const submissionData = {
      answers: formattedAnswers,
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
        let options = question.question.options || [];
        
        // Randomize answer options if exam has randomizeOptions enabled
        if (exam?.randomizeOptions && options.length > 1) {
          // Create a seeded random function using questionId for consistent randomization
          const seed = question.questionId;
          const random = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
          };
          
          // Create array of options with their original indices
          const optionsWithIndices = options.map((option: string, index: number) => ({
            option,
            originalIndex: index,
            originalLetter: String.fromCharCode(65 + index)
          }));
          
          // Fisher-Yates shuffle with seeded random
          for (let i = optionsWithIndices.length - 1; i > 0; i--) {
            const j = Math.floor(random(seed + i) * (i + 1));
            [optionsWithIndices[i], optionsWithIndices[j]] = [optionsWithIndices[j], optionsWithIndices[i]];
          }
          
          // Update options to use shuffled order
          options = optionsWithIndices.map((item: any) => item.option);
        }
        
        // Determine if this question supports multiple correct answers
        // Use the allowMultipleAnswers flag sent by the server (preserves UI info without exposing answers)
        const hasMultipleCorrectAnswers = question.question.allowMultipleAnswers === true;
        console.log(`[DEBUG] Frontend Question ${question.question.id}: allowMultipleAnswers=${question.question.allowMultipleAnswers}, hasMultipleCorrectAnswers=${hasMultipleCorrectAnswers}`);
        
        // Handle multiple selections vs single selection
        const selectedAnswers = Array.isArray(answer) ? answer : (answer ? [answer] : []);
        
        if (hasMultipleCorrectAnswers) {
          // Render checkboxes for multiple selection
          return (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('examTaking.multipleAnswersAllowed')}
                </p>
              </div>
              {options.map((option: string, index: number) => {
                const letter = String.fromCharCode(65 + index);
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 transition-colors">
                    <Checkbox
                      checked={selectedAnswers.includes(letter)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleAnswerChange(question.questionId, [...selectedAnswers, letter].sort());
                        } else {
                          handleAnswerChange(question.questionId, selectedAnswers.filter(a => a !== letter));
                        }
                      }}
                      id={`option-${index}`}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <Label 
                      htmlFor={`option-${index}`} 
                      className="flex-1 cursor-pointer text-sm leading-relaxed"
                    >
                      <span className="font-medium mr-2">{letter}.</span>
                      <span>{option}</span>
                    </Label>
                  </div>
                );
              })}
            </div>
          );
        } else {
          // Render radio buttons for single selection (existing behavior)
          return (
            <div className="space-y-3">
              <RadioGroup
                value={answer || ''}
                onValueChange={(value) => handleAnswerChange(question.questionId, value)}
              >
                {options.map((option: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 transition-colors">
                    <RadioGroupItem 
                      value={String.fromCharCode(65 + index)} 
                      id={`option-${index}`}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <Label 
                      htmlFor={`option-${index}`} 
                      className="flex-1 cursor-pointer text-sm leading-relaxed"
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                      <span>{option}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        }

      case 'short_answer':
        return (
          <Input
            placeholder={t('examTaking.enterYourAnswer')}
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
            className="w-full text-base h-12 sm:h-10"
          />
        );

      case 'essay':
        return (
          <Textarea
            placeholder={t('examTaking.writeYourEssay')}
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
            className="w-full min-h-[150px] sm:min-h-[200px] text-base leading-relaxed"
          />
        );

      case 'fill_blank':
        // Handle both stored string and parsed array for correct answers
        let correctAnswers = [];
        if (question.question.correctAnswer) {
          if (typeof question.question.correctAnswer === 'string') {
            correctAnswers = question.question.correctAnswer.split('|').filter((a: string) => a.trim());
          } else if (Array.isArray(question.question.correctAnswer)) {
            correctAnswers = question.question.correctAnswer;
          }
        }
        
        // If no correct answers found, try to parse from question text by counting blanks
        if (correctAnswers.length === 0) {
          const blankCount = (question.question.questionText.match(/___/g) || []).length;
          if (blankCount > 0) {
            correctAnswers = Array(blankCount).fill('');
          } else {
            // Default to 2 blanks if we can't determine
            correctAnswers = ['', ''];
          }
        }
        
        // Ensure answer is an array for fill_blank questions
        const currentAnswers = Array.isArray(answer) ? answer : [];
        
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>{t('examTaking.instructions')}</strong> {t('examTaking.fillInBlankInstructions')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                {t('examTaking.numberOfBlanks', { count: correctAnswers.length })}
              </p>
            </div>
            {correctAnswers.map((_: string, index: number) => (
              <div key={index} className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                <Label className="text-sm font-medium block sm:whitespace-nowrap sm:w-28">
                  {t('examTaking.blank', { number: index + 1 })}
                </Label>
                <Input
                  placeholder={t('examTaking.enterAnswerForBlank', { number: index + 1 })}
                  value={currentAnswers[index] || ''}
                  onChange={(e) => {
                    const newAnswer = [...currentAnswers];
                    // Ensure array is long enough
                    while (newAnswer.length <= index) {
                      newAnswer.push('');
                    }
                    newAnswer[index] = e.target.value;
                    handleAnswerChange(question.questionId, newAnswer);
                  }}
                  className="flex-1 text-base h-12 sm:h-10"
                />
              </div>
            ))}
          </div>
        );

      case 'matching':
        // Handle different formats for matching data
        let leftItems: string[] = [];
        let rightItems: string[] = [];
        
        if (question.question.options) {
          let optionsData: any = question.question.options;
          
          // Parse string data if needed
          if (typeof optionsData === 'string') {
            try {
              optionsData = JSON.parse(optionsData);
            } catch (e) {
              console.error('Error parsing matching options:', e);
              optionsData = [];
            }
          }
          
          // Handle array of pair objects format: [{left: "A", right: "B"}, ...]
          if (Array.isArray(optionsData) && optionsData.length > 0 && optionsData[0].left) {
            leftItems = optionsData.map((pair: any) => String(pair.left || ''));
            rightItems = optionsData.map((pair: any) => String(pair.right || ''));
          }
          // Handle object with left/right arrays format: {left: [...], right: [...]}
          else if (optionsData.left && optionsData.right) {
            leftItems = (optionsData.left || []).map((item: any) => 
              typeof item === 'string' ? item : String(item?.name || item?.text || item)
            );
            rightItems = (optionsData.right || []).map((item: any) => 
              typeof item === 'string' ? item : String(item?.name || item?.text || item)
            );
          }
          // Handle object with leftItems/rightItems format
          else if (optionsData.leftItems && optionsData.rightItems) {
            leftItems = (optionsData.leftItems || []).map((item: any) => String(item));
            rightItems = (optionsData.rightItems || []).map((item: any) => String(item));
          }
        }
        
        // Fallback to correctAnswer if no valid options found
        if (leftItems.length === 0 && rightItems.length === 0 && question.question.correctAnswer) {
          try {
            let fallbackData = question.question.correctAnswer;
            if (typeof fallbackData === 'string') {
              fallbackData = JSON.parse(fallbackData);
            }
            
            // Handle array of pair objects in correctAnswer
            if (Array.isArray(fallbackData) && fallbackData.length > 0 && fallbackData[0].left) {
              leftItems = fallbackData.map((pair: any) => String(pair.left || ''));
              rightItems = fallbackData.map((pair: any) => String(pair.right || ''));
            }
            // Handle other formats in correctAnswer
            else if (fallbackData.left && fallbackData.right) {
              leftItems = (fallbackData.left || []).map((item: any) => String(item));
              rightItems = (fallbackData.right || []).map((item: any) => String(item));
            }
          } catch (e) {
            console.error('Error parsing correctAnswer for matching:', e);
          }
        }
        
        // Create a stable shuffle for right items using the question ID as seed
        // This ensures the same randomization every time for the same question
        const shuffleArray = (array: string[], seed: number): string[] => {
          const shuffled = [...array];
          let currentIndex = shuffled.length;
          let temporaryValue, randomIndex;
          
          // Use a simple seeded random number generator
          const random = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
          };
          
          while (0 !== currentIndex) {
            randomIndex = Math.floor(random() * currentIndex);
            currentIndex--;
            
            temporaryValue = shuffled[currentIndex];
            shuffled[currentIndex] = shuffled[randomIndex];
            shuffled[randomIndex] = temporaryValue;
          }
          
          return shuffled;
        };
        
        // Shuffle right items for display using question ID as seed for consistency
        const shuffledRightItems = shuffleArray(rightItems, question.questionId);
        const currentMatches = answer || {};
        
        return (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                <strong>Instructions:</strong> Match each item on the left with the correct item on the right.
              </p>
              <p className="text-xs text-green-600 dark:text-green-300">
                Select the corresponding option for each item.
              </p>
            </div>
            
            {leftItems.length === 0 && rightItems.length === 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No matching items found. Please contact your instructor.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {leftItems.map((leftItem: string, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                    <div className="sm:w-1/2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {index + 1}. {String(leftItem)}
                      </Label>
                    </div>
                    <div className="sm:w-1/2">
                      <select
                        value={currentMatches[index] || ''}
                        onChange={(e) => {
                          const newMatches = { ...currentMatches };
                          if (e.target.value) {
                            newMatches[index] = e.target.value;
                          } else {
                            delete newMatches[index];
                          }
                          handleAnswerChange(question.questionId, newMatches);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select a match...</option>
                        {shuffledRightItems.map((rightItem: string, rightIndex: number) => (
                          <option key={rightIndex} value={rightItem}>
                            {String.fromCharCode(65 + rightIndex)}. {String(rightItem)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'ranking':
        // Ensure ranking items are strings
        let rankingItems = [];
        try {
          if (question.question.options) {
            if (Array.isArray(question.question.options)) {
              rankingItems = question.question.options.map((item: any) => 
                typeof item === 'string' ? item : (item?.name || item?.text || String(item))
              );
            } else if (typeof question.question.options === 'string') {
              const parsed = JSON.parse(question.question.options);
              rankingItems = (Array.isArray(parsed) ? parsed : []).map((item: any) => 
                typeof item === 'string' ? item : (item?.name || item?.text || String(item))
              );
            }
          }
        } catch (e) {
          console.error('Error parsing ranking options:', e);
          rankingItems = [];
        }
        
        const currentRanking = Array.isArray(answer) ? answer : [];
        
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                <strong>Instructions:</strong> Drag and drop items to rank them in the correct order.
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-300">
                Arrange from most important/highest to least important/lowest.
              </p>
            </div>
            <div className="space-y-2">
              {rankingItems.map((item: string, index: number) => {
                const currentPosition = currentRanking.indexOf(item);
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-move"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', item);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedItem = e.dataTransfer.getData('text/plain');
                      const newRanking = [...currentRanking];
                      
                      // Remove dragged item from current position
                      const draggedIndex = newRanking.indexOf(draggedItem);
                      if (draggedIndex > -1) {
                        newRanking.splice(draggedIndex, 1);
                      }
                      
                      // Insert at new position
                      const dropIndex = newRanking.indexOf(item);
                      if (dropIndex > -1) {
                        newRanking.splice(dropIndex, 0, draggedItem);
                      } else {
                        newRanking.push(draggedItem);
                      }
                      
                      handleAnswerChange(question.questionId, newRanking);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-xs font-medium">
                      {currentPosition >= 0 ? currentPosition + 1 : '?'}
                    </div>
                    <div className="flex-1 text-sm">{item}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newRanking = [...currentRanking];
                          if (!newRanking.includes(item)) {
                            newRanking.push(item);
                          }
                          handleAnswerChange(question.questionId, newRanking);
                        }}
                        disabled={currentRanking.includes(item)}
                      >
                        Add
                      </Button>
                      {currentRanking.includes(item) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newRanking = currentRanking.filter(r => r !== item);
                            handleAnswerChange(question.questionId, newRanking);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'drag_drop':
        // Handle both stored string and object for drag-drop data
        let dragDropData: any = { zones: [], items: [] };
        if (question.question.options) {
          if (typeof question.question.options === 'string') {
            try {
              dragDropData = JSON.parse(question.question.options);
            } catch (e) {
              console.error('Error parsing drag-drop options:', e);
            }
          } else if (typeof question.question.options === 'object') {
            dragDropData = question.question.options;
          }
        }
        
        // Fallback to correctAnswer if options are empty
        if ((!dragDropData.zones || dragDropData.zones.length === 0) && question.question.correctAnswer) {
          try {
            const fallbackData = typeof question.question.correctAnswer === 'string' 
              ? JSON.parse(question.question.correctAnswer) 
              : question.question.correctAnswer;
            if (fallbackData && (fallbackData.zones || fallbackData.items)) {
              dragDropData = fallbackData;
            }
          } catch (e) {
            console.error('Error parsing correctAnswer for drag-drop:', e);
          }
        }

        // Ensure zones and items are arrays of strings
        // Handle both "zones" and "categories" field names
        const zonesList = dragDropData.zones || dragDropData.categories || [];
        const zones = zonesList.map((zone: any) => 
          typeof zone === 'string' ? zone : (zone?.name || zone?.zone || String(zone))
        );
        const items = (dragDropData.items || []).map((item: any) => 
          typeof item === 'string' ? item : (item?.name || item?.item || String(item))
        );
        // Change to array-based storage for multiple items per zone
        const currentPlacements = answer || {};
        
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                <strong>Instructions:</strong> Drag items from the bank and drop them into the correct zones.
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300">
                You can place multiple items in each zone. Click the × to remove items.
              </p>
            </div>
            
            {items.length === 0 || zones.length === 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {items.length === 0 ? 'No draggable items found.' : 'No drop zones found.'} Please contact your instructor.
                </p>
              </div>
            ) : (
              <>
                {/* Item Bank */}
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Item Bank</h4>
                  <div className="flex flex-wrap gap-2">
                    {items.filter((item: string) => {
                      // Check if item is in any zone (supporting multiple items per zone)
                      return !Object.values(currentPlacements).some((zoneItems: any) => 
                        Array.isArray(zoneItems) ? zoneItems.includes(item) : zoneItems === item
                      );
                    }).map((item: string, index: number) => (
                      <div
                        key={index}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md cursor-move hover:shadow-md transition-shadow text-sm"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(item));
                        }}
                      >
                        {String(item)}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Drop Zones */}
                <div className="grid gap-4 md:grid-cols-2">
                  {zones.map((zone: string, zoneIndex: number) => (
                    <div
                      key={zoneIndex}
                      className="min-h-24 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedItem = e.dataTransfer.getData('text/plain');
                        const newPlacements = { ...currentPlacements };
                        
                        // Remove item from any existing zone (handle both array and single item formats)
                        Object.keys(newPlacements).forEach(key => {
                          if (Array.isArray(newPlacements[key])) {
                            newPlacements[key] = newPlacements[key].filter((item: string) => item !== draggedItem);
                            if (newPlacements[key].length === 0) {
                              delete newPlacements[key];
                            }
                          } else if (newPlacements[key] === draggedItem) {
                            delete newPlacements[key];
                          }
                        });
                        
                        // Add to new zone (use array to support multiple items)
                        if (!newPlacements[zoneIndex]) {
                          newPlacements[zoneIndex] = [];
                        }
                        if (!Array.isArray(newPlacements[zoneIndex])) {
                          newPlacements[zoneIndex] = [newPlacements[zoneIndex]];
                        }
                        newPlacements[zoneIndex].push(draggedItem);
                        
                        handleAnswerChange(question.questionId, newPlacements);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{String(zone)}</h4>
                      <div className="min-h-8 flex flex-wrap gap-2">
                        {currentPlacements[zoneIndex] && (
                          Array.isArray(currentPlacements[zoneIndex]) ? 
                            currentPlacements[zoneIndex].map((item: string, itemIndex: number) => (
                              <div key={itemIndex} className="inline-block px-3 py-2 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-md text-sm">
                                {String(item)}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-2 h-auto p-0 text-xs"
                                  onClick={() => {
                                    const newPlacements = { ...currentPlacements };
                                    if (Array.isArray(newPlacements[zoneIndex])) {
                                      newPlacements[zoneIndex] = newPlacements[zoneIndex].filter((_: string, i: number) => i !== itemIndex);
                                      if (newPlacements[zoneIndex].length === 0) {
                                        delete newPlacements[zoneIndex];
                                      }
                                    }
                                    handleAnswerChange(question.questionId, newPlacements);
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            )) :
                            <div className="inline-block px-3 py-2 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-md text-sm">
                              {String(currentPlacements[zoneIndex])}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="ml-2 h-auto p-0 text-xs"
                                onClick={() => {
                                  const newPlacements = { ...currentPlacements };
                                  delete newPlacements[zoneIndex];
                                  handleAnswerChange(question.questionId, newPlacements);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                        )}
                        {(!currentPlacements[zoneIndex] || (Array.isArray(currentPlacements[zoneIndex]) && currentPlacements[zoneIndex].length === 0)) && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 italic">Drop items here</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
            <Button>{t('examTaking.backToExams')}</Button>
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
            <Button>{t('examTaking.backToExams')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show password prompt if required
  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-background dark:bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-center">{t('examTaking.passwordRequired')}</CardTitle>
              <p className="text-center text-muted-foreground">
                {t('examTaking.examRequiresPassword')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="exam-password">{t('examTaking.enterPassword')}</Label>
                <Input
                  id="exam-password"
                  type="password"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder={t('examTaking.passwordPlaceholder')}
                  className="mt-2"
                  data-testid="input-exam-password"
                />
              </div>
              <div className="flex gap-2">
                <Link href="/exams" className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="button-cancel-exam">
                    {t('common.cancel')}
                  </Button>
                </Link>
                <Button 
                  onClick={handlePasswordSubmit} 
                  className="flex-1"
                  disabled={!enteredPassword.trim()}
                  data-testid="button-submit-password"
                >
                  {t('examTaking.startExam')}
                </Button>
              </div>
            </CardContent>
          </Card>
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
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <main className="flex-1 lg:ml-64 p-2 sm:p-3 lg:pl-2 lg:pr-4 w-full min-w-0">
          <div className="w-full">
            {/* Exam Header */}
            <div className="mb-2 sm:mb-3">
              {/* Mobile-First Header Layout */}
              <div className="space-y-1 sm:space-y-2">
                {/* Top Row: Back Button + Title */}
                <div className="flex items-start gap-2">
                  <Link href="/exams">
                    <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 px-2">
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      <span className="text-sm">{t('examTaking.back')}</span>
                    </Button>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground dark:text-foreground leading-tight">{exam.title}</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      {t('examTaking.questionOf', { current: currentQuestionIndex + 1, total: questions.length })}
                    </p>
                  </div>
                </div>
                
                {/* Bottom Row: Timer + Save Button */}
                <div className="flex items-center justify-between gap-2">
                  {exam && exam.duration && exam.duration > 0 ? (
                    timeRemaining !== null && timeRemaining > 0 ? (
                      <div className={`flex items-center px-3 py-2 rounded-lg text-sm flex-1 max-w-fit ${
                        timeRemaining <= 30 
                          ? 'bg-red-600 text-white dark:bg-red-600 dark:text-white animate-pulse border-2 border-red-400' 
                          : timeRemaining < 300 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border border-red-300' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        <Clock className={`h-4 w-4 mr-2 ${timeRemaining <= 30 ? 'animate-bounce' : ''}`} />
                        <span className="font-mono font-bold text-base">{formatTime(timeRemaining)}</span>
                        {timeRemaining <= 30 && (
                          <AlertCircle className="h-4 w-4 ml-2 animate-pulse" />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 flex-1 max-w-fit">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="font-mono">{t('examTaking.loading')}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center px-3 py-2 rounded-lg text-sm bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 flex-1 max-w-fit">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm">{t('examTaking.noTimeLimit')}</span>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSaveProgress} 
                    variant="outline" 
                    size="sm"
                    disabled={saveProgressMutation.isPending}
                    className="flex-shrink-0 h-8 px-3"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    <span className="text-xs sm:text-sm">{saveProgressMutation.isPending ? t('examTaking.saving') : t('examTaking.saveProgress')}</span>
                  </Button>
                </div>
              </div>
              
              <Progress value={progress} className="mt-1 sm:mt-2" />
            </div>

            {/* Question Card */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4">
                <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center text-sm sm:text-base">
                    <FileText className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="line-clamp-2">{t('examTaking.question', { number: currentQuestionIndex + 1 })}</span>
                  </CardTitle>
                  <Badge variant="secondary" className="self-start sm:self-center text-xs">
                    {currentQuestion.points} {currentQuestion.points !== 1 ? t('examTaking.points') : t('examTaking.point')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="prose max-w-none">
                  <p className="text-sm sm:text-base leading-relaxed">{currentQuestion.question.questionText}</p>
                </div>

                <div className="mt-2 sm:mt-3">
                  {renderQuestion(currentQuestion)}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('examTaking.previousQuestion')}</span>
                <span className="sm:hidden">{t('examTaking.previous')}</span>
              </Button>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={handleSubmitExam}
                  disabled={isSubmitting || submitExamMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-medium"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isSubmitting || submitExamMutation.isPending ? t('examTaking.submitting') : t('examTaking.submitExam')}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-medium"
                >
                  <span className="hidden sm:inline">{t('examTaking.nextQuestion')}</span>
                  <span className="sm:hidden">{t('examTaking.next')}</span>
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}