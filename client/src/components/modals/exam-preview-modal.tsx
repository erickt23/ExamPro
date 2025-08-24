import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  FileText, 
  Play, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Users,
  Target,
  Lock
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface ExamPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number | null;
  onPublish?: () => void;
}

export default function ExamPreviewModal({ open, onOpenChange, examId, onPublish }: ExamPreviewModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

  // Fetch exam questions
  const { data: examQuestions = [] } = useQuery({
    queryKey: ["/api/exams", examId, "questions"],
    queryFn: async () => {
      if (!examId) return [];
      const response = await fetch(`/api/exams/${examId}/questions`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  // Publish exam mutation
  const publishExamMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/exams/${examId}`, { status: "active" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam published successfully! Students can now access it.",
      });
      onOpenChange(false);
      onPublish?.();
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
      
      // Extract error message from server response
      let errorMessage = "Failed to publish exam";
      if (error.message.includes(":")) {
        const parts = error.message.split(":");
        if (parts.length > 1) {
          errorMessage = parts[1].trim();
        }
      }
      
      toast({
        title: "Publishing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (!examData) {
    return null;
  }

  const currentQuestion = examQuestions[currentQuestionIndex];
  const totalQuestions = examQuestions.length;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  const renderQuestionPreview = (question: any) => {
    if (!question) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">
                Question {currentQuestionIndex + 1} of {totalQuestions}
                {question.question?.title && `: ${question.question.title}`}
              </CardTitle>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={getQuestionTypeColor(question.question?.questionType)}>
                  {formatQuestionType(question.question?.questionType)}
                </Badge>
                <Badge variant="outline">{question.points} points</Badge>
                {question.question?.timeLimit && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {question.question.timeLimit} min
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-gray-900 whitespace-pre-wrap">{question.question?.questionText}</p>
          </div>

          {/* Multiple Choice Options */}
          {question.question?.questionType === 'multiple_choice' && question.question?.options && (
            <div className="space-y-3">
              <RadioGroup disabled className="space-y-3">
                {question.question.options.map((option: string, index: number) => {
                  const letter = String.fromCharCode(65 + index);
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value={letter} id={`option-${letter}`} />
                      <Label htmlFor={`option-${letter}`} className="flex-1 cursor-pointer">
                        <span className="font-medium mr-2">{letter}.</span>
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Short Answer */}
          {question.question?.questionType === 'short_answer' && (
            <div>
              <Input 
                placeholder="Student will type their answer here..."
                disabled
                className="bg-gray-50"
              />
            </div>
          )}

          {/* Essay */}
          {question.question?.questionType === 'essay' && (
            <div>
              <Textarea 
                placeholder="Student will write their essay response here..."
                rows={6}
                disabled
                className="bg-gray-50"
              />
            </div>
          )}

          {/* Fill in the Blank */}
          {question.question?.questionType === 'fill_blank' && (
            <div>
              <Input 
                placeholder="Student will fill in the blank here..."
                disabled
                className="bg-gray-50"
              />
            </div>
          )}

          {/* Matching Questions */}
          {question.question?.questionType === 'matching' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                  <strong>Instructions:</strong> Match each item on the left with the correct item on the right.
                </p>
                <p className="text-xs text-green-600 dark:text-green-300">
                  Students will select the corresponding option for each item.
                </p>
              </div>
              
              {(() => {
                // Handle different formats for matching data - same logic as exam-taking
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
                  if (Array.isArray(optionsData) && optionsData.length > 0 && optionsData[0]?.left) {
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
                }
                
                // Fallback to correctAnswer if no valid options found
                if (leftItems.length === 0 && rightItems.length === 0 && question.question.correctAnswer) {
                  try {
                    let fallbackData = question.question.correctAnswer;
                    if (typeof fallbackData === 'string') {
                      fallbackData = JSON.parse(fallbackData);
                    }
                    
                    // Handle array of pair objects in correctAnswer
                    if (Array.isArray(fallbackData) && fallbackData.length > 0 && fallbackData[0]?.left) {
                      leftItems = fallbackData.map((pair: any) => String(pair.left || ''));
                      rightItems = fallbackData.map((pair: any) => String(pair.right || ''));
                    }
                  } catch (e) {
                    console.error('Error parsing correctAnswer for matching:', e);
                  }
                }
                
                if (leftItems.length === 0 && rightItems.length === 0) {
                  return (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        No matching items found. Please contact your instructor.
                      </p>
                    </div>
                  );
                }
                
                return (
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
                            disabled
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          >
                            <option value="">Student will select a match...</option>
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
                );
              })()}
            </div>
          )}

          {/* Ranking Questions */}
          {question.question?.questionType === 'ranking' && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                  <strong>Instructions:</strong> Drag and drop items to rank them in the correct order.
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-300">
                  Students will arrange from most important/highest to least important/lowest.
                </p>
              </div>
              
              {(() => {
                // Parse ranking items from options
                let rankingItems: string[] = [];
                
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
                
                if (rankingItems.length === 0) {
                  return (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        No ranking items found. Please contact your instructor.
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Items to rank (students will drag to reorder):
                    </h4>
                    {rankingItems.map((item: string, index: number) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="text-gray-900 dark:text-gray-100">{item}</span>
                        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                          ⋮⋮ Draggable
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Drag and Drop Questions */}
          {question.question?.questionType === 'drag_drop' && (
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                  <strong>Instructions:</strong> Drag items from the bank and drop them into the correct zones.
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300">
                  Students can place multiple items in each zone. Click the × to remove items.
                </p>
              </div>
              
              {(() => {
                // Handle drag-drop data parsing
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
                
                if (zones.length === 0 && items.length === 0) {
                  return (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        No drop zones or items found. Please contact your instructor.
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-4">
                    {/* Drop Zones */}
                    {zones.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Drop Zones (students will drag items here):
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          {zones.map((zone: string, index: number) => (
                            <div 
                              key={index}
                              className="min-h-[100px] p-4 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-900/20"
                            >
                              <h5 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                                {zone}
                              </h5>
                              <p className="text-xs text-orange-600 dark:text-orange-400">
                                Drop zone - students will place items here
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Draggable Items */}
                    {items.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Draggable Items (students will drag these):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item: string, index: number) => (
                            <div 
                              key={index}
                              className="px-3 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-300 dark:border-blue-600 text-sm"
                            >
                              {item}
                              <span className="ml-2 text-xs opacity-70">⋮⋮</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Question Navigation */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous Question
            </Button>
            <span className="text-sm text-gray-600">
              {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              Next Question
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Exam Preview: {examData.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exam Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Exam Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {examData.duration} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Points:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {examData.totalPoints} points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attempts:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {examData.attemptsAllowed === -1 ? 'Unlimited' : examData.attemptsAllowed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-medium">{totalQuestions}</span>
                </div>
                {examData.availableFrom && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available From:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(examData.availableFrom)}
                    </span>
                  </div>
                )}
                {examData.availableUntil && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Until:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(examData.availableUntil)}
                    </span>
                  </div>
                )}
                {examData.requirePassword && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Password Protected:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Lock className="h-4 w-4" />
                      Yes
                    </span>
                  </div>
                )}
              </div>
              
              {examData.description && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Description:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{examData.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exam Readiness Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Readiness Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {totalQuestions > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={totalQuestions > 0 ? "text-green-700" : "text-red-700"}>
                    Questions added: {totalQuestions}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {examData.title && examData.title.trim() ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={examData.title && examData.title.trim() ? "text-green-700" : "text-red-700"}>
                    Title configured
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {examData.duration > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={examData.duration > 0 ? "text-green-700" : "text-red-700"}>
                    Duration set: {examData.duration} minutes
                  </span>
                </div>
              </div>
              
              {totalQuestions === 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">
                    ⚠️ This exam has no questions. Add questions before publishing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question Preview */}
          {totalQuestions > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Question Preview</h3>
              {renderQuestionPreview(currentQuestion)}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close Preview
            </Button>
            
            {examData.status === 'draft' && (
              <Button
                onClick={() => publishExamMutation.mutate()}
                disabled={publishExamMutation.isPending || totalQuestions === 0}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {publishExamMutation.isPending ? (
                  "Publishing..."
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Publish Exam
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}