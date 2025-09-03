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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useTranslation } from "@/hooks/useTranslation";

interface HomeworkQuestion {
  id: number;
  homeworkId: number;
  questionId: number;
  order: number;
  points: number;
  question: {
    id: number;
    questionText: string;
    questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'fill_blank' | 'matching' | 'ranking' | 'drag_drop';
    options?: string[] | any;
    correctAnswer?: string;
    timeLimit?: number;
    difficulty?: string;
    category?: string;
    bloomsTaxonomy?: string;
  };
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
  const { t } = useTranslation();
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

  // Load data with priority: saved progress > existing submission
  useEffect(() => {
    if (questions.length > 0) {
      // Check if there's saved progress first - it takes priority
      if (savedProgress?.hasProgress) {
        const progressData = savedProgress.progressData;
        if (progressData) {
          setAnswers(progressData.answers || {});
          setCurrentQuestionIndex(progressData.currentQuestionIndex || 0);
          
          toast({
            title: "Progress Restored",
            description: "Your previous progress has been restored.",
            variant: "default",
          });
          return; // Exit early, don't load existing submission
        }
      }
      
      // If no saved progress, load existing submission data
      if (existingData?.answers) {
        const existingAnswers: Record<number, string> = {};
        existingData.answers.forEach((answer: any) => {
          existingAnswers[answer.questionId] = answer.answerText || "";
        });
        setAnswers(existingAnswers);
        setExistingSubmission(existingData.submission);
      }
    }
  }, [savedProgress, existingData, questions]);

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
    const unansweredQuestions = questions.filter(q => {
      const answer = answers[q.id];
      if (!answer) return true;
      
      // Handle different answer types
      if (typeof answer === 'string') {
        return answer.trim() === '';
      } else if (Array.isArray(answer)) {
        return answer.length === 0;
      } else if (typeof answer === 'object') {
        return Object.keys(answer).length === 0;
      }
      
      return true;
    });
    
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
      answers: questions.map(q => {
        const answer = answers[q.id];
        
        // Handle multiple choice questions with multiple selections
        if (q.question.questionType === 'multiple_choice' && Array.isArray(answer)) {
          return {
            questionId: q.question.id,
            answerText: JSON.stringify(answer), // Keep for backward compatibility
            selectedOption: null,
            selectedOptions: answer, // Store the array of selected options
            attachmentUrl: null,
            linkUrl: null,
          };
        } else {
          return {
            questionId: q.question.id,
            answerText: answer || "",
            selectedOption: typeof answer === 'string' ? answer : null,
            attachmentUrl: null,
            linkUrl: null,
          };
        }
      }),
    };

    submitHomeworkMutation.mutate(submissionData);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).filter(qId => {
    const answer = answers[parseInt(qId)];
    if (!answer) return false;
    
    // Handle different answer types
    if (typeof answer === 'string') {
      return answer.trim() !== '';
    } else if (Array.isArray(answer)) {
      return answer.length > 0 && answer.some((item: any) => item && item.toString().trim() !== '');
    } else if (typeof answer === 'object') {
      return Object.keys(answer).length > 0;
    }
    
    return false;
  }).length;

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

    switch (question.question.questionType) {
      case 'multiple_choice':
        const options = question.question.options as string[] || [];
        
        // Determine if this question supports multiple correct answers
        const hasMultipleCorrectAnswers = question.question.correctAnswers && 
          Array.isArray(question.question.correctAnswers) && 
          (question.question.correctAnswers as string[]).length > 1;
        
        // Handle multiple selections vs single selection
        const selectedAnswers = Array.isArray(value) ? value : (value ? [value] : []);
        
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
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedAnswers.includes(letter)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleAnswerChange(question.id, [...selectedAnswers, letter].sort());
                        } else {
                          handleAnswerChange(question.id, selectedAnswers.filter(a => a !== letter));
                        }
                      }}
                      id={`option-${index}`}
                    />
                    <Label htmlFor={`option-${index}`} className="cursor-pointer">
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
            <RadioGroup 
              value={value} 
              onValueChange={(val) => handleAnswerChange(question.id, val)}
              className="space-y-3"
            >
              {options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          );
        }

      case 'short_answer':
        return (
          <Input
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            className="w-full"
          />
        );

      case 'fill_blank':
        // Parse correct answers from the question data
        let correctAnswers: string[] = [];
        if (question.question.correctAnswer) {
          try {
            if (typeof question.question.correctAnswer === 'string') {
              correctAnswers = question.question.correctAnswer.split('|').map(a => a.trim()).filter(a => a);
            } else if (Array.isArray(question.question.correctAnswer)) {
              correctAnswers = question.question.correctAnswer;
            }
          } catch (e) {
            console.error('Error parsing fill-blank correct answers:', e);
            correctAnswers = [''];
          }
        }
        
        // Ensure we have at least one blank
        if (correctAnswers.length === 0) {
          correctAnswers = [''];
        }
        
        const currentAnswers = Array.isArray(value) ? value : (value ? [value] : []);
        
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>Instructions:</strong> Fill in each blank with your answer.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                Number of blanks: {correctAnswers.length}
              </p>
            </div>
            {correctAnswers.map((_: string, index: number) => (
              <div key={index} className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                <Label className="text-sm font-medium block sm:whitespace-nowrap sm:w-28">
                  Blank {index + 1}:
                </Label>
                <Input
                  placeholder={`Enter answer for blank ${index + 1}`}
                  value={currentAnswers[index] || ''}
                  onChange={(e) => {
                    const newAnswer = [...currentAnswers];
                    // Ensure array is long enough
                    while (newAnswer.length <= index) {
                      newAnswer.push('');
                    }
                    newAnswer[index] = e.target.value;
                    handleAnswerChange(question.id, newAnswer);
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
        const shuffleArray = (array: string[], seed: number): string[] => {
          const shuffled = [...array];
          let currentIndex = shuffled.length;
          let temporaryValue, randomIndex;
          
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
        const shuffledRightItems = shuffleArray(rightItems, question.id);
        const currentMatches = value || {};
        
        return (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                <strong>{t('examTaking.instructions')}</strong> {t('examTaking.matchingInstructions')}
              </p>
              <p className="text-xs text-green-600 dark:text-green-300">
                {t('examTaking.selectCorrespondingOption')}
              </p>
            </div>
            
            {leftItems.length === 0 && rightItems.length === 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t('examTaking.noMatchingItems')}
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
                          handleAnswerChange(question.id, newMatches);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">{t('examTaking.selectMatch')}</option>
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
        
        const currentRanking = Array.isArray(value) ? value : [];
        
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                <strong>{t('examTaking.instructions')}</strong> {t('examTaking.rankingInstructions')}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-300">
                {t('examTaking.arrangeFromHighToLow')}
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
                      
                      handleAnswerChange(question.id, newRanking);
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
                          handleAnswerChange(question.id, newRanking);
                        }}
                        disabled={currentRanking.includes(item)}
                      >
                        {t('examTaking.add')}
                      </Button>
                      {currentRanking.includes(item) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newRanking = currentRanking.filter(r => r !== item);
                            handleAnswerChange(question.id, newRanking);
                          }}
                        >
                          {t('examTaking.remove')}
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
        let dragDropData = { zones: [], items: [] };
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
        const currentPlacements = value || {};
        
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                <strong>{t('examTaking.instructions')}</strong> {t('examTaking.dragDropInstructions')}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300">
                {t('examTaking.multipleItemsPerZone')}
              </p>
            </div>
            
            {items.length === 0 || zones.length === 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {items.length === 0 ? t('examTaking.noDraggableItems') : t('examTaking.noDropZones')}
                </p>
              </div>
            ) : (
              <>
                {/* Item Bank */}
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">{t('examTaking.itemBank')}</h4>
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
                        
                        handleAnswerChange(question.id, newPlacements);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        {String(zone)}
                      </h4>
                      <div className="flex flex-wrap gap-2 min-h-16">
                        {(Array.isArray(currentPlacements[zoneIndex]) ? currentPlacements[zoneIndex] : 
                          currentPlacements[zoneIndex] ? [currentPlacements[zoneIndex]] : []
                        ).map((item: string, itemIndex: number) => (
                          <div
                            key={itemIndex}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded text-sm flex items-center gap-1"
                          >
                            {String(item)}
                            <button
                              onClick={() => {
                                const newPlacements = { ...currentPlacements };
                                if (Array.isArray(newPlacements[zoneIndex])) {
                                  newPlacements[zoneIndex] = newPlacements[zoneIndex].filter((i: string) => i !== item);
                                  if (newPlacements[zoneIndex].length === 0) {
                                    delete newPlacements[zoneIndex];
                                  }
                                } else {
                                  delete newPlacements[zoneIndex];
                                }
                                handleAnswerChange(question.id, newPlacements);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
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
                        {formatQuestionType(currentQuestion.question.questionType)}
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
                    <p className="text-lg leading-relaxed">{currentQuestion.question.questionText}</p>
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