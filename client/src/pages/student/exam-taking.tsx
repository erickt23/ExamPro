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
    
    // Convert answers to the format expected by the server
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => {
      if (Array.isArray(answer)) {
        // For fill_blank questions, answer is an array
        return {
          questionId: parseInt(questionId),
          answerText: JSON.stringify(answer),
          selectedOption: null,
          attachmentUrl: null,
          linkUrl: null,
        };
      } else if (typeof answer === 'object' && answer !== null) {
        // For other question types with object structure
        return {
          questionId: parseInt(questionId),
          answerText: answer.text || '',
          selectedOption: answer.selectedOption || null,
          attachmentUrl: answer.attachmentUrl || null,
          linkUrl: answer.linkUrl || null,
        };
      } else {
        // For simple string answers
        return {
          questionId: parseInt(questionId),
          answerText: answer || '',
          selectedOption: null,
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
        const options = question.question.options || [];
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

      case 'short_answer':
        return (
          <Input
            placeholder="Enter your answer..."
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
            className="w-full text-base"
          />
        );

      case 'essay':
        return (
          <Textarea
            placeholder="Write your essay response here..."
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.questionId, e.target.value)}
            className="w-full min-h-[200px] text-base leading-relaxed"
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
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>Instructions:</strong> Fill in each blank with your answer.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                Number of blanks to fill: {correctAnswers.length}
              </p>
            </div>
            {correctAnswers.map((_: string, index: number) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                <Label className="text-sm font-medium sm:whitespace-nowrap sm:w-24">
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
                    handleAnswerChange(question.questionId, newAnswer);
                  }}
                  className="flex-1 text-base"
                />
              </div>
            ))}
          </div>
        );

      case 'matching':
        // Handle both stored string and object for matching data
        let matchingData = { left: [], right: [] };
        if (question.question.options) {
          if (typeof question.question.options === 'string') {
            try {
              matchingData = JSON.parse(question.question.options);
            } catch (e) {
              console.error('Error parsing matching options:', e);
            }
          } else if (typeof question.question.options === 'object') {
            matchingData = question.question.options;
          }
        }
        
        // Fallback to correctAnswer if options are empty
        if ((!matchingData.left || matchingData.left.length === 0) && question.question.correctAnswer) {
          try {
            const fallbackData = typeof question.question.correctAnswer === 'string' 
              ? JSON.parse(question.question.correctAnswer) 
              : question.question.correctAnswer;
            if (fallbackData && (fallbackData.left || fallbackData.right)) {
              matchingData = fallbackData;
            }
          } catch (e) {
            console.error('Error parsing correctAnswer for matching:', e);
          }
        }
        
        // Ensure items are arrays of strings
        const leftItems = (matchingData.left || []).map((item: any) => 
          typeof item === 'string' ? item : (item?.name || item?.text || String(item))
        );
        const rightItems = (matchingData.right || []).map((item: any) => 
          typeof item === 'string' ? item : (item?.name || item?.text || String(item))
        );
        const currentMatches = answer || {};
        
        // Debug log to see what we have
        console.log('Matching question data:', { leftItems, rightItems, matchingData, question });
        
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
                        {rightItems.map((rightItem: string, rightIndex: number) => (
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
        const zones = (dragDropData.zones || []).map((zone: any) => 
          typeof zone === 'string' ? zone : (zone?.name || zone?.zone || String(zone))
        );
        const items = (dragDropData.items || []).map((item: any) => 
          typeof item === 'string' ? item : (item?.name || item?.item || String(item))
        );
        // Change to array-based storage for multiple items per zone
        const currentPlacements = answer || {};
        
        // Debug log to see what we have
        console.log('Drag-drop question data:', { zones, items, dragDropData, question });
        
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
            
            {items.length === 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No draggable items found. Please contact your instructor.
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
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <main className="flex-1 lg:ml-64 p-4 lg:p-6 w-full min-w-0">
          <div className="max-w-4xl mx-auto w-full">
            {/* Exam Header */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Link href="/exams">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Back to Exams</span>
                      <span className="sm:hidden">Back</span>
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-foreground dark:text-foreground line-clamp-2">{exam.title}</h1>
                    <p className="text-muted-foreground text-sm">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  {exam && exam.duration && exam.duration > 0 ? (
                    timeRemaining !== null && timeRemaining > 0 ? (
                      <div className={`flex items-center px-3 py-2 rounded-lg text-sm ${
                        timeRemaining < 300 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="font-mono">{formatTime(timeRemaining)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="font-mono">Loading...</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center px-3 py-2 rounded-lg text-sm bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm">No time limit</span>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSaveProgress} 
                    variant="outline" 
                    size="sm"
                    disabled={saveProgressMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{saveProgressMutation.isPending ? "Saving..." : "Save Progress"}</span>
                    <span className="sm:hidden">{saveProgressMutation.isPending ? "..." : "Save"}</span>
                  </Button>
                </div>
              </div>
              
              <Progress value={progress} className="mt-4" />
            </div>

            {/* Question Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span className="line-clamp-1">Question {currentQuestionIndex + 1}</span>
                  </CardTitle>
                  <Badge variant="secondary" className="self-start sm:self-center">
                    {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <p className="text-base lg:text-lg leading-relaxed">{currentQuestion.question.questionText}</p>
                </div>

                <div className="mt-6">
                  {renderQuestion(currentQuestion)}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-center mt-6 gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="w-full sm:w-auto"
              >
                <span className="hidden sm:inline">Previous Question</span>
                <span className="sm:hidden">Previous</span>
              </Button>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmitExam}
                    disabled={isSubmitting || submitExamMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isSubmitting || submitExamMutation.isPending ? "Submitting..." : "Submit Exam"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 w-full sm:w-auto"
                  >
                    <span className="hidden sm:inline">Next Question</span>
                    <span className="sm:hidden">Next</span>
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