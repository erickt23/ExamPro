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

interface ExamPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number | null;
  onPublish?: () => void;
}

export default function ExamPreviewModal({ open, onOpenChange, examId, onPublish }: ExamPreviewModalProps) {
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
    if (!type) return 'Unknown';
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
                className="bg-green-600 hover:bg-green-700"
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