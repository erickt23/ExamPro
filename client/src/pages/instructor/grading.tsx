import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Clock, 
  User, 
  FileText, 
  CheckCircle, 
  Save,
  Award,
  Link,
  Download,
  Paperclip,
  ExternalLink
} from "lucide-react";

export default function GradingPage() {
  const [match, params] = useRoute("/grading/:submissionId");
  const submissionId = match ? params?.submissionId : null;
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [gradingData, setGradingData] = useState<Record<number, { score: number; feedback: string }>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  // Fetch submission details for grading
  const { data: submissionDetails, isLoading: submissionLoading } = useQuery({
    queryKey: ["/api/submissions", submissionId, "grade"],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}/grade`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!submissionId,
    retry: false,
  });

  // Grade individual answer mutation
  const gradeAnswerMutation = useMutation({
    mutationFn: async ({ answerId, score, feedback }: { answerId: number; score: number; feedback: string }) => {
      await apiRequest("PUT", `/api/answers/${answerId}/grade`, { score, feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", submissionId, "grade"] });
      toast({
        title: "Success",
        description: "Grade saved successfully",
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
      toast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive",
      });
    },
  });

  // Finalize submission mutation
  const finalizeSubmissionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/submissions/${submissionId}/finalize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Success",
        description: "Submission graded successfully!",
      });
      navigate("/");
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
        description: "Failed to finalize submission",
        variant: "destructive",
      });
    },
  });

  const handleScoreChange = (answerId: number, score: string) => {
    const numScore = parseFloat(score) || 0;
    setGradingData(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], score: numScore }
    }));
  };

  const handleFeedbackChange = (answerId: number, feedback: string) => {
    setGradingData(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], feedback }
    }));
  };

  const saveGrade = (answerId: number) => {
    const gradeData = gradingData[answerId];
    if (!gradeData) return;
    
    gradeAnswerMutation.mutate({
      answerId,
      score: gradeData.score,
      feedback: gradeData.feedback
    });
  };

  const finalizeSubmission = () => {
    finalizeSubmissionMutation.mutate();
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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!submissionId || submissionLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">Loading submission details...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!submissionDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-red-600">Submission not found</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { submission, exam, student, answers } = submissionDetails;
  const subjectiveAnswers = answers.filter((answer: any) => 
    answer.question && ['essay', 'short_answer', 'fill_blank'].includes(answer.question.questionType)
  );
  const objectiveAnswers = answers.filter((answer: any) => 
    answer.question && answer.question.questionType === 'multiple_choice'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Manual Grading</h1>
                <p className="text-gray-600">Review and grade student submission</p>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                Pending Review
              </Badge>
            </div>

            {/* Submission Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Submission Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Student:</span>
                    <span className="font-medium flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {student.firstName} {student.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exam:</span>
                    <span className="font-medium">{exam.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Objective Questions (Auto-graded) */}
            {objectiveAnswers.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Auto-graded Questions ({objectiveAnswers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {objectiveAnswers.map((answer: any) => (
                      <div key={answer.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getQuestionTypeColor(answer.question.questionType)}>
                                {formatQuestionType(answer.question.questionType)}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {parseFloat(answer.score || '0')} / {parseFloat(answer.maxScore || '0')} points
                              </span>
                            </div>
                            <h4 className="font-medium mb-2">{answer.question.questionText}</h4>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Selected: </span>
                          <span className="font-medium">{answer.selectedOption}</span>
                          <span className="text-gray-600"> | Correct: </span>
                          <span className="font-medium">{answer.question.correctAnswer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subjective Questions (Manual Grading) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-orange-600" />
                  Questions Requiring Manual Grading ({subjectiveAnswers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {subjectiveAnswers.map((answer: any) => (
                    <div key={answer.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getQuestionTypeColor(answer.question.questionType)}>
                              {formatQuestionType(answer.question.questionType)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              Max: {parseFloat(answer.maxScore || '0')} points
                            </span>
                          </div>
                          <h4 className="font-medium mb-3">{answer.question.questionText}</h4>
                        </div>
                      </div>

                      {/* Student Answer */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">Student Answer:</h5>
                        
                        {/* Text Answer */}
                        {answer.answerText && (
                          <div className="bg-gray-50 p-3 rounded border mb-3">
                            <p className="whitespace-pre-wrap">
                              {answer.answerText}
                            </p>
                          </div>
                        )}
                        
                        {/* File Attachment */}
                        {answer.attachmentUrl && (
                          <div className="bg-blue-50 p-3 rounded border mb-3">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">File Attachment:</span>
                            </div>
                            <div className="mt-2">
                              <a 
                                href={answer.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                <Download className="h-3 w-3" />
                                View/Download File
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}
                        
                        {/* Link URL */}
                        {answer.linkUrl && (
                          <div className="bg-green-50 p-3 rounded border mb-3">
                            <div className="flex items-center gap-2">
                              <Link className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-900">Submitted Link:</span>
                            </div>
                            <div className="mt-2">
                              <a 
                                href={answer.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-sm break-all"
                              >
                                {answer.linkUrl}
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            </div>
                          </div>
                        )}
                        
                        {/* No answer provided message */}
                        {!answer.answerText && !answer.attachmentUrl && !answer.linkUrl && (
                          <div className="bg-gray-50 p-3 rounded border">
                            <p className="text-gray-500 italic">
                              No answer provided
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Grading Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Score
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={parseFloat(answer.maxScore || '0')}
                            step="0.1"
                            placeholder="Enter score"
                            value={gradingData[answer.id]?.score || parseFloat(answer.score || '0')}
                            onChange={(e) => handleScoreChange(answer.id, e.target.value)}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={() => saveGrade(answer.id)}
                            disabled={gradeAnswerMutation.isPending}
                            className="w-full"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Grade
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Feedback (optional)
                        </label>
                        <Textarea
                          placeholder="Provide feedback to the student..."
                          rows={3}
                          value={gradingData[answer.id]?.feedback || answer.feedback || ''}
                          onChange={(e) => handleFeedbackChange(answer.id, e.target.value)}
                        />
                      </div>

                      {answer.gradedAt && (
                        <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Graded on {new Date(answer.gradedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Finalize Button */}
            <div className="flex justify-end">
              <Button
                onClick={finalizeSubmission}
                disabled={finalizeSubmissionMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {finalizeSubmissionMutation.isPending ? "Finalizing..." : "Finalize Grading"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}