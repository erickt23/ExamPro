import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDetailedSubmissionTime, formatSubmissionDuration } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ExternalLink,
  Eye,
  BookOpen,
  Notebook,
  Calculator,
  CloudUpload
} from "lucide-react";
import { calculateFinalGrade } from "@shared/gradeConfig";


// Component for displaying subject grades with finalization controls
function SubjectGradesCard({ 
  subject, 
  gradeSettings, 
  onFinalize, 
  onUnfinalize, 
  finalizeLoading, 
  unfinalizeLoading 
}: any) {
  const { data: finalizationStatus, isLoading: statusLoading } = useQuery({
    queryKey: [`/api/finalize-grades/${subject.subjectId}/status`],
    queryFn: async () => {
      const response = await fetch(`/api/finalize-grades/${subject.subjectId}/status`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  const isFinalized = finalizationStatus?.isFinalized || false;

  // Get coefficients for this subject (course-specific or global)
  const subjectSettings = gradeSettings?.courses?.[subject.subjectId] || gradeSettings?.global;
  const assignmentCoeff = subjectSettings ? Number(subjectSettings.assignmentCoefficient) : 0.4;
  const examCoeff = subjectSettings ? Number(subjectSettings.examCoefficient) : 0.6;

  return (
    <Card className={`mb-6 ${isFinalized ? 'border-blue-200 bg-blue-50' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {subject.subjectName}
              {isFinalized && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  Finalized
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Formula: {(assignmentCoeff * 100).toFixed(0)}% Assignments + {(examCoeff * 100).toFixed(0)}% Exams
              {isFinalized && " (locked coefficients)"}
            </p>
          </div>
          <div className="flex gap-2">
            {isFinalized ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUnfinalize(subject.subjectId)}
                disabled={unfinalizeLoading}
              >
                {unfinalizeLoading ? "Unfinalizing..." : "Unfinalize Grades"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onFinalize(subject.subjectId)}
                disabled={finalizeLoading}
              >
                {finalizeLoading ? "Finalizing..." : "Finalize Grades"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Assignment Score</TableHead>
              <TableHead>Exam Score</TableHead>
              <TableHead>Final Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subject.students.map((grade: any, index: number) => {
              const finalGrade = calculateFinalGrade(
                grade.totalAssignmentScore,
                grade.totalAssignmentMaxScore,
                grade.totalExamScore,
                grade.totalExamMaxScore,
                assignmentCoeff,
                examCoeff
              );
              
              const assignmentPercentage = grade.totalAssignmentMaxScore > 0 
                ? ((grade.totalAssignmentScore / grade.totalAssignmentMaxScore) * 100).toFixed(1)
                : "N/A";
              
              const examPercentage = grade.totalExamMaxScore > 0 
                ? ((grade.totalExamScore / grade.totalExamMaxScore) * 100).toFixed(1)
                : "N/A";

              return (
                <TableRow key={`${grade.studentId}-${grade.subjectId}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {grade.studentName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {grade.totalAssignmentScore}/{grade.totalAssignmentMaxScore}
                      <br />
                      <span className="text-gray-500">({assignmentPercentage}%)</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {grade.totalExamScore}/{grade.totalExamMaxScore}
                      <br />
                      <span className="text-gray-500">({examPercentage}%)</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-bold text-lg ${isFinalized ? 'text-blue-700' : ''}`}>
                      {finalGrade.toFixed(1)}%
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Component for listing submissions to grade
function GradingList() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch exam submissions that need grading
  const { data: examSubmissions, isLoading: examLoading } = useQuery({
    queryKey: ["/api/submissions", { status: "pending", userRole: "instructor", userId: user?.id }],
    queryFn: async () => {
      const response = await fetch(`/api/submissions?status=pending&userRole=instructor&userId=${user?.id}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Fetch homework submissions that need grading
  const { data: homeworkSubmissions, isLoading: homeworkLoading } = useQuery({
    queryKey: ["/api/homework-submissions", { status: "submitted", userRole: "instructor", userId: user?.id }],
    queryFn: async () => {
      const response = await fetch(`/api/homework-submissions?status=submitted&userRole=instructor&userId=${user?.id}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Fetch instructor student grades for final grade calculation
  const { data: studentGrades, isLoading: gradesLoading } = useQuery({
    queryKey: ["/api/instructor-student-grades", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/instructor-student-grades");
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Fetch grade settings for coefficient display
  const { data: gradeSettings } = useQuery({
    queryKey: ["/api/grade-settings"],
    retry: false,
  });

  const handleGradeExamSubmission = (submissionId: number) => {
    navigate(`/grading/${submissionId}`);
  };

  const handleGradeHomeworkSubmission = (submissionId: number) => {
    navigate(`/homework-grading/${submissionId}`);
  };

  // Grade finalization mutations
  const finalizeGradesMutation = useMutation({
    mutationFn: async (subjectId: number) => {
      return await apiRequest("POST", `/api/finalize-grades/${subjectId}`);
    },
    onSuccess: () => {
      toast({
        title: "Grades Finalized",
        description: "Course grades have been finalized and are now immune to coefficient changes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-student-grades"] });
    },
    onError: (error) => {
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
        description: "Failed to finalize grades.",
        variant: "destructive",
      });
    },
  });

  const unfinalizeGradesMutation = useMutation({
    mutationFn: async (subjectId: number) => {
      return await apiRequest("DELETE", `/api/finalize-grades/${subjectId}`);
    },
    onSuccess: () => {
      toast({
        title: "Grades Unfinalized",
        description: "Course grades are now editable and will reflect coefficient changes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-student-grades"] });
    },
    onError: (error) => {
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
        description: "Failed to unfinalize grades.",
        variant: "destructive",
      });
    },
  });



  // Group grades by subject
  const gradesBySubject = studentGrades?.reduce((acc: any, grade: any) => {
    if (!acc[grade.subjectId]) {
      acc[grade.subjectId] = {
        subjectId: grade.subjectId,
        subjectName: grade.subjectName,
        students: []
      };
    }
    acc[grade.subjectId].students.push(grade);
    return acc;
  }, {}) || {};

  const subjects = Object.values(gradesBySubject);

  if (examLoading || homeworkLoading || gradesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading submissions and grades...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('grading.title')}</h1>
        <p className="text-gray-600 text-sm md:text-base">{t('grading.description')}</p>
      </div>

      <Tabs defaultValue="exams" className="w-full">
        <TabsList>
          <TabsTrigger value="exams" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t('grading.examSubmissions')} ({examSubmissions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="homework" className="flex items-center gap-2">
            <Notebook className="h-4 w-4" />
            {t('grading.homeworkSubmissions')} ({homeworkSubmissions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="final-grades" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            {t('grading.finalGrades')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exams">
          <Card>
            <CardHeader>
              <CardTitle>{t('grading.examSubmissionsPendingReview')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!examSubmissions || examSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('grading.noExamSubmissions')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('grading.student')}</TableHead>
                      <TableHead>{t('grading.exam')}</TableHead>
                      <TableHead>{t('grading.submitted')}</TableHead>
                      <TableHead>{t('grading.status')}</TableHead>
                      <TableHead>{t('grading.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examSubmissions.map((submission: any) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {submission.student?.firstName} {submission.student?.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{submission.exam?.title}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatDetailedSubmissionTime(submission.submittedAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t('grading.needsReview')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleGradeExamSubmission(submission.id)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Grade
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homework">
          <Card>
            <CardHeader>
              <CardTitle>{t('grading.homeworkSubmissionsPendingReview')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!homeworkSubmissions || homeworkSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Notebook className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('grading.noHomeworkSubmissions')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('grading.student')}</TableHead>
                      <TableHead>{t('grading.homework')}</TableHead>
                      <TableHead>{t('grading.submitted')}</TableHead>
                      <TableHead>{t('grading.status')}</TableHead>
                      <TableHead>{t('grading.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {homeworkSubmissions.map((submission: any) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {submission.student?.firstName} {submission.student?.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{submission.homework?.title}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatDetailedSubmissionTime(submission.submittedAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t('grading.needsReview')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleGradeHomeworkSubmission(submission.id)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            {t('grading.grade')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final-grades">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('grading.finalGradesByCourse')}</h2>
              <p className="text-sm text-gray-600 mt-1">
{t('grading.finalizeGradesMessage')}
              </p>
            </div>
            
            {!studentGrades || studentGrades.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No student grades available</p>
                  <p className="text-sm mt-2">Students need to complete and receive graded assignments and exams to see final grades</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {subjects.map((subject: any) => (
                  <SubjectGradesCard
                    key={subject.subjectId}
                    subject={subject}
                    gradeSettings={gradeSettings}
                    onFinalize={(subjectId: number) => finalizeGradesMutation.mutate(subjectId)}
                    onUnfinalize={(subjectId: number) => unfinalizeGradesMutation.mutate(subjectId)}
                    finalizeLoading={finalizeGradesMutation.isPending}
                    unfinalizeLoading={unfinalizeGradesMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component for individual submission grading
function SubmissionGrading({ submissionId, isHomeworkGrading }: { submissionId: string; isHomeworkGrading: boolean }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [gradingData, setGradingData] = useState<Record<number, { score: number; feedback: string }>>({});
  const [saveStatuses, setSaveStatuses] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const autoSaveTimers = useRef<Record<number, NodeJS.Timeout>>({});

  // Convert Google Cloud Storage URL to our authenticated API endpoint
  const getSecureFileUrl = (attachmentUrl: string) => {
    if (!attachmentUrl) return '';
    
    // If it's already our API endpoint, return as is
    if (attachmentUrl.startsWith('/objects/')) {
      return attachmentUrl;
    }
    
    // If it's a Google Cloud Storage URL, extract the object path
    if (attachmentUrl.startsWith('https://storage.googleapis.com/')) {
      try {
        const url = new URL(attachmentUrl);
        const pathParts = url.pathname.split('/');
        if (pathParts.length >= 4) {
          // Format: /bucket/private_dir/uploads/object_id -> /objects/uploads/object_id
          const objectPath = pathParts.slice(3).join('/');
          return `/objects/uploads/${objectPath.split('/').pop()}`;
        }
      } catch (error) {
        console.error('Error parsing attachment URL:', error);
      }
    }
    
    return attachmentUrl;
  };

  // Fetch submission details for grading
  const { data: submissionDetails, isLoading: submissionLoading } = useQuery({
    queryKey: [isHomeworkGrading ? "/api/homework-submissions" : "/api/submissions", submissionId, "grade"],
    queryFn: async () => {
      const endpoint = isHomeworkGrading 
        ? `/api/homework-submissions/${submissionId}/grade`
        : `/api/submissions/${submissionId}/grade`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!submissionId,
    retry: false,
  });

  // Grade individual answer mutation with auto-save support
  const gradeAnswerMutation = useMutation({
    mutationFn: async ({ answerId, score, feedback, isAutoSave }: { answerId: number; score: number; feedback: string; isAutoSave?: boolean }) => {
      const endpoint = isHomeworkGrading 
        ? `/api/homework-answers/${answerId}/grade`
        : `/api/answers/${answerId}/grade`;
      await apiRequest("PUT", endpoint, { score, feedback });
      return { answerId, isAutoSave };
    },
    onSuccess: ({ answerId, isAutoSave }) => {
      const queryKey = isHomeworkGrading 
        ? ["/api/homework-submissions", submissionId, "grade"]
        : ["/api/submissions", submissionId, "grade"];
      queryClient.invalidateQueries({ queryKey });
      
      setSaveStatuses(prev => ({ ...prev, [answerId]: 'saved' }));
      
      if (!isAutoSave) {
        toast({
          title: "Success",
          description: "Grade saved successfully",
        });
      }
      
      // Clear save status after 3 seconds
      setTimeout(() => {
        setSaveStatuses(prev => ({ ...prev, [answerId]: 'idle' }));
      }, 3000);
    },
    onError: (error: Error, { answerId }) => {
      setSaveStatuses(prev => ({ ...prev, [answerId]: 'error' }));
      
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
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setSaveStatuses(prev => ({ ...prev, [answerId]: 'idle' }));
      }, 5000);
    },
  });

  // Finalize submission mutation
  const finalizeSubmissionMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isHomeworkGrading 
        ? `/api/homework-submissions/${submissionId}/finalize`
        : `/api/submissions/${submissionId}/finalize`;
      await apiRequest("PUT", endpoint, {});
    },
    onSuccess: () => {
      const queryKey = isHomeworkGrading ? ["/api/homework"] : ["/api/submissions"];
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: `${isHomeworkGrading ? 'Homework' : 'Submission'} graded successfully!`,
      });
      navigate("/grading");
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

  // Auto-save function with debouncing
  const autoSaveGrade = useCallback((answerId: number) => {
    const gradeData = gradingData[answerId];
    if (!gradeData || (gradeData.score === 0 && !gradeData.feedback)) return;
    
    setSaveStatuses(prev => ({ ...prev, [answerId]: 'saving' }));
    
    gradeAnswerMutation.mutate({
      answerId,
      score: gradeData.score,
      feedback: gradeData.feedback,
      isAutoSave: true
    });
  }, [gradingData, gradeAnswerMutation]);

  const handleScoreChange = (answerId: number, score: string) => {
    const numScore = parseFloat(score) || 0;
    setGradingData(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], score: numScore }
    }));
    
    // Clear existing timer
    if (autoSaveTimers.current[answerId]) {
      clearTimeout(autoSaveTimers.current[answerId]);
    }
    
    // Set new auto-save timer (3 seconds delay)
    autoSaveTimers.current[answerId] = setTimeout(() => {
      autoSaveGrade(answerId);
    }, 3000);
  };

  const handleFeedbackChange = (answerId: number, feedback: string) => {
    setGradingData(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], feedback }
    }));
    
    // Clear existing timer
    if (autoSaveTimers.current[answerId]) {
      clearTimeout(autoSaveTimers.current[answerId]);
    }
    
    // Set new auto-save timer (3 seconds delay)
    autoSaveTimers.current[answerId] = setTimeout(() => {
      autoSaveGrade(answerId);
    }, 3000);
  };

  const saveGrade = (answerId: number) => {
    const gradeData = gradingData[answerId];
    if (!gradeData) return;
    
    // Clear auto-save timer since we're manually saving
    if (autoSaveTimers.current[answerId]) {
      clearTimeout(autoSaveTimers.current[answerId]);
    }
    
    setSaveStatuses(prev => ({ ...prev, [answerId]: 'saving' }));
    
    gradeAnswerMutation.mutate({
      answerId,
      score: gradeData.score,
      feedback: gradeData.feedback,
      isAutoSave: false
    });
  };

  const finalizeSubmission = () => {
    finalizeSubmissionMutation.mutate();
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

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

  if (submissionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading submission details...</div>
      </div>
    );
  }

  if (!submissionDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Submission not found</div>
      </div>
    );
  }

  const { submission, exam, homework, student, answers } = submissionDetails;
  const assignmentData = isHomeworkGrading ? homework : exam;
  const subjectiveAnswers = answers.filter((answer: any) => 
    answer.question && ['essay', 'short_answer', 'fill_blank'].includes(answer.question.questionType)
  );
  const objectiveAnswers = answers.filter((answer: any) => 
    answer.question && ['multiple_choice', 'matching', 'drag_drop', 'ranking'].includes(answer.question.questionType)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/grading")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grading Center
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Manual Grading</h1>
          <p className="text-gray-600">Review and grade student {isHomeworkGrading ? 'homework' : 'submission'}</p>
        </div>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
          Pending Review
        </Badge>
      </div>

      {/* Submission Info */}
      <Card>
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
              <span className="text-gray-600">{isHomeworkGrading ? 'Homework:' : 'Exam:'}</span>
              <span className="font-medium">{assignmentData.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Submitted:</span>
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDetailedSubmissionTime(submission.submittedAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objective Questions (Auto-graded) */}
      {objectiveAnswers.length > 0 && (
        <Card>
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
                    {answer.question.questionType === 'multiple_choice' ? (
                      <>
                        <span className="text-gray-600">Selected: </span>
                        <span className="font-medium">{answer.selectedOption}</span>
                        <span className="text-gray-600"> | Correct: </span>
                        <span className="font-medium">{answer.question.correctAnswer}</span>
                      </>
                    ) : answer.question.questionType === 'matching' ? (
                      <div className="space-y-1">
                        {(() => {
                          try {
                            // Parse student answers and question pairs
                            const studentAnswer = typeof answer.answerText === 'string' 
                              ? JSON.parse(answer.answerText) 
                              : answer.answerText;
                            
                            let questionPairs = [];
                            if (answer.question.options) {
                              const optionsData = typeof answer.question.options === 'string' 
                                ? JSON.parse(answer.question.options) 
                                : answer.question.options;
                              questionPairs = Array.isArray(optionsData) ? optionsData : [];
                            } else if (answer.question.correctAnswer) {
                              const correctData = typeof answer.question.correctAnswer === 'string'
                                ? JSON.parse(answer.question.correctAnswer)
                                : answer.question.correctAnswer;
                              questionPairs = Array.isArray(correctData) ? correctData : [];
                            }
                            
                            return questionPairs.map((pair: any, index: number) => {
                              const studentSelection = studentAnswer[index] || 'No answer';
                              return (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <span className="font-medium">{pair.left}</span>
                                  <span>→</span>
                                  <span className={`font-medium ${studentSelection === pair.right ? 'text-green-600' : 'text-red-600'}`}>
                                    {studentSelection}
                                  </span>
                                  {studentSelection !== pair.right && (
                                    <span className="text-gray-500">
                                      (✓ {pair.right})
                                    </span>
                                  )}
                                </div>
                              );
                            });
                          } catch (error) {
                            return <span className="text-red-600">Error parsing answer</span>;
                          }
                        })()}
                      </div>
                    ) : (
                      <span className="text-gray-600">Auto-graded</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjective Questions (Manual Grading) */}
      <Card>
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
                      {answer.question.questionType === 'matching' ? (
                        <div className="space-y-2">
                          {(() => {
                            try {
                              // Parse student answers and question pairs
                              const studentAnswer = typeof answer.answerText === 'string' 
                                ? JSON.parse(answer.answerText) 
                                : answer.answerText;
                              
                              let questionPairs = [];
                              if (answer.question.options) {
                                const optionsData = typeof answer.question.options === 'string' 
                                  ? JSON.parse(answer.question.options) 
                                  : answer.question.options;
                                questionPairs = Array.isArray(optionsData) ? optionsData : [];
                              } else if (answer.question.correctAnswer) {
                                const correctData = typeof answer.question.correctAnswer === 'string'
                                  ? JSON.parse(answer.question.correctAnswer)
                                  : answer.question.correctAnswer;
                                questionPairs = Array.isArray(correctData) ? correctData : [];
                              }
                              
                              return questionPairs.map((pair: any, index: number) => {
                                const studentSelection = studentAnswer[index] || 'No answer';
                                return (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                    <span className="font-medium">{pair.left}</span>
                                    <span className="text-gray-600">→</span>
                                    <span className={`font-medium ${studentSelection === pair.right ? 'text-green-600' : 'text-red-600'}`}>
                                      {studentSelection}
                                    </span>
                                    {studentSelection !== pair.right && (
                                      <span className="text-sm text-gray-500">
                                        (Correct: {pair.right})
                                      </span>
                                    )}
                                  </div>
                                );
                              });
                            } catch (error) {
                              console.error('Error parsing matching answer:', error);
                              return (
                                <p className="whitespace-pre-wrap text-red-600">
                                  Error displaying matching answer: {answer.answerText}
                                </p>
                              );
                            }
                          })()}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">
                          {answer.answerText}
                        </p>
                      )}
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
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex items-center gap-2"
                        >
                          <a
                            href={getSecureFileUrl(answer.attachmentUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Attachment
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading Section */}
                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-700 mb-3">Grade This Answer:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Score (out of {parseFloat(answer.maxScore || '0')})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={parseFloat(answer.maxScore || '0')}
                        step="0.5"
                        placeholder="Enter score"
                        value={gradingData[answer.id]?.score || ''}
                        onChange={(e) => handleScoreChange(answer.id, e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Feedback
                      </label>
                      <Textarea
                        placeholder="Provide feedback for the student"
                        value={gradingData[answer.id]?.feedback || ''}
                        onChange={(e) => handleFeedbackChange(answer.id, e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      onClick={() => saveGrade(answer.id)}
                      disabled={gradeAnswerMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Grade
                    </Button>
                    
                    {/* Auto-save status indicator */}
                    <div className="flex items-center gap-2 text-sm">
                      {saveStatuses[answer.id] === 'saving' && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <CloudUpload className="h-4 w-4 animate-pulse" />
                          <span>Saving...</span>
                        </div>
                      )}
                      {saveStatuses[answer.id] === 'saved' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Auto-saved</span>
                        </div>
                      )}
                      {saveStatuses[answer.id] === 'error' && (
                        <div className="flex items-center gap-1 text-red-600">
                          <span className="h-4 w-4">⚠️</span>
                          <span>Save failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Finalize Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Ready to finalize?</h3>
              <p className="text-sm text-gray-600">
                Once finalized, grades will be published to the student and cannot be changed.
              </p>
            </div>
            <Button
              onClick={finalizeSubmission}
              disabled={finalizeSubmissionMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Award className="h-4 w-4 mr-2" />
              Finalize Grades
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GradingPage() {
  const [examMatch, examParams] = useRoute("/grading/:submissionId");
  const [homeworkMatch, homeworkParams] = useRoute("/homework-grading/:submissionId");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const isHomeworkGrading = !!homeworkMatch;
  const submissionId = isHomeworkGrading ? homeworkParams?.submissionId : examParams?.submissionId;
  const isGradingSpecificSubmission = !!submissionId;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl mx-auto">
            {isGradingSpecificSubmission ? (
              <SubmissionGrading 
                submissionId={submissionId!} 
                isHomeworkGrading={isHomeworkGrading} 
              />
            ) : (
              <GradingList />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}