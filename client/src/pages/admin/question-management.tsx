import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatSubmissionTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import CreateQuestionModal from "@/components/modals/create-question-modal";
import EditQuestionModal from "@/components/modals/edit-question-modal";
import ImportQuestionsModal from "@/components/modals/import-questions-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Upload,
  Settings,
  Users,
  UserCheck,
  Crown
} from "lucide-react";
import { QuestionsPagination } from "@/components/ui/questions-pagination";
import { MathField } from "@/components/ui/math-field";

export default function AdminQuestionManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
  const [sharingDialogOpen, setSharingDialogOpen] = useState(false);
  const [questionToShare, setQuestionToShare] = useState<any>(null);
  
  const [filters, setFilters] = useState({
    subjectId: "all",
    questionType: "all",
    difficulty: "all", 
    category: "all",
    createdBy: "all", // all, admins, instructors
    visibilityType: "all",
    search: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "Admin access required.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });

  // Fetch all instructors for sharing controls
  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users", { role: "instructor" }],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      const users = await response.json();
      return users.filter((user: any) => user.role === 'instructor' || user.role === 'admin');
    },
    retry: false,
  });

  // Fetch all questions with admin privileges (see questions from all instructors)
  const { data: questionsResult, isLoading: questionsLoading, refetch: refetchQuestions } = useQuery({
    queryKey: ["/api/admin/all-questions", filters, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.subjectId !== "all") params.append("subject", filters.subjectId);
      if (filters.questionType !== "all") params.append("type", filters.questionType);
      if (filters.difficulty !== "all") params.append("difficulty", filters.difficulty);
      if (filters.category !== "all") params.append("category", filters.category);
      if (filters.createdBy !== "all") params.append("createdBy", filters.createdBy);
      if (filters.visibilityType !== "all") params.append("visibilityType", filters.visibilityType);
      if (filters.search.trim()) params.append("search", filters.search.trim());
      
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());
      
      const response = await fetch(`/api/admin/all-questions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return await apiRequest("DELETE", `/api/admin/questions/${questionId}`, {});
    },
    onSuccess: () => {
      toast({
        title: t('questions.questionDeleted'),
        description: t('questions.questionDeletedSuccess'),
      });
      refetchQuestions();
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
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
        description: "Failed to delete question",
        variant: "destructive",
      });
    },
  });

  // Update question visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ questionId, visibilityType, authorizedInstructorIds }: { 
      questionId: number; 
      visibilityType: string; 
      authorizedInstructorIds?: string[];
    }) => {
      return await apiRequest("PUT", `/api/admin/questions/${questionId}/visibility`, {
        visibilityType,
        authorizedInstructorIds
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question visibility updated successfully",
      });
      refetchQuestions();
      setSharingDialogOpen(false);
      setQuestionToShare(null);
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
        description: "Failed to update question visibility",
        variant: "destructive",
      });
    },
  });

  const handleEditQuestion = (questionId: number) => {
    setEditQuestionId(questionId);
    setShowEditModal(true);
  };

  const handleDeleteQuestion = (questionId: number) => {
    setQuestionToDelete(questionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (questionToDelete) {
      deleteQuestionMutation.mutate(questionToDelete);
    }
  };

  const handleShareQuestion = (question: any) => {
    setQuestionToShare(question);
    setSharingDialogOpen(true);
  };

  const getCreatorBadge = (question: any) => {
    if (question.createdByAdmin) {
      return <Badge variant="default" className="bg-purple-100 text-purple-800"><Crown className="h-3 w-3 mr-1" />Admin</Badge>;
    } else {
      return <Badge variant="outline"><Users className="h-3 w-3 mr-1" />Instructor</Badge>;
    }
  };

  const getVisibilityBadge = (question: any) => {
    if (question.visibilityType === 'all_instructors') {
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><Eye className="h-3 w-3 mr-1" />All Instructors</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><UserCheck className="h-3 w-3 mr-1" />Specific Only</Badge>;
    }
  };

  const questions = questionsResult?.questions || [];
  const totalPages = questionsResult?.totalPages || 1;
  const totalQuestions = questionsResult?.total || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Question Management</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage all questions in the system - view, edit, delete, and control sharing permissions
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-create-question"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Question
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowImportModal(true)}
                data-testid="button-import-questions"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Questions
              </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search questions..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-10"
                        data-testid="input-search"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select
                      value={filters.subjectId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, subjectId: value }))}
                    >
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="exam">Exam Questions</SelectItem>
                        <SelectItem value="homework">Homework Questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="questionType">Question Type</Label>
                    <Select
                      value={filters.questionType}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, questionType: value }))}
                    >
                      <SelectTrigger id="questionType">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                        <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                        <SelectItem value="matching">Matching</SelectItem>
                        <SelectItem value="ranking">Ranking</SelectItem>
                        <SelectItem value="drag_drop">Drag & Drop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="createdBy">Created By</Label>
                    <Select
                      value={filters.createdBy}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, createdBy: value }))}
                    >
                      <SelectTrigger id="createdBy">
                        <SelectValue placeholder="All Creators" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Creators</SelectItem>
                        <SelectItem value="admins">Admin Created</SelectItem>
                        <SelectItem value="instructors">Instructor Created</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={filters.visibilityType}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, visibilityType: value }))}
                    >
                      <SelectTrigger id="visibility">
                        <SelectValue placeholder="All Visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Visibility</SelectItem>
                        <SelectItem value="all_instructors">All Instructors</SelectItem>
                        <SelectItem value="specific_instructors">Specific Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    All Questions ({totalQuestions})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {questionsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No questions found</p>
                    <p className="text-sm text-gray-400">Try adjusting your filters or create a new question</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question: any) => (
                      <div
                        key={question.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-4">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {question.title || `Question ${question.id}`}
                              </h3>
                              <Badge variant="outline" className="capitalize">
                                {question.category}
                              </Badge>
                              {getCreatorBadge(question)}
                              {getVisibilityBadge(question)}
                              <Badge variant="secondary" className="capitalize">
                                {question.questionType.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                              {question.questionType === 'stem' ? (
                                <MathField
                                  value={question.questionText}
                                  readonly={true}
                                  className="border-none p-0 m-0 bg-transparent text-gray-600 dark:text-gray-300"
                                  hideToolbar={true}
                                  hideVirtualKeyboardToggle={true}
                                />
                              ) : (
                                <p>{question.questionText}</p>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>Subject: {question.subject?.name || 'Unknown'}</span>
                              <span>Difficulty: {question.difficulty}</span>
                              <span>Points: {question.points}</span>
                              <span>Used: {question.usageCount} times</span>
                              <span>Created: {formatSubmissionTime(question.createdAt)}</span>
                              {question.instructorName && (
                                <span>By: {question.instructorName}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShareQuestion(question)}
                              data-testid={`button-share-${question.id}`}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditQuestion(question.id)}
                              data-testid={`button-edit-${question.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteQuestion(question.id)}
                              disabled={deleteQuestionMutation.isPending}
                              data-testid={`button-delete-${question.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6">
                    <QuestionsPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      total={totalQuestions}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateQuestionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        questionCategory="exam"
      />

      <EditQuestionModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        questionId={editQuestionId}
      />

      <ImportQuestionsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
              This will also remove the question from any exams or homework assignments that use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sharing Dialog */}
      <SharingDialog
        open={sharingDialogOpen}
        onOpenChange={setSharingDialogOpen}
        question={questionToShare}
        instructors={instructors}
        onUpdate={(visibilityType, authorizedInstructorIds) => 
          updateVisibilityMutation.mutate({
            questionId: questionToShare?.id,
            visibilityType,
            authorizedInstructorIds
          })
        }
        isLoading={updateVisibilityMutation.isPending}
      />
    </div>
  );
}

// Sharing Dialog Component
function SharingDialog({ 
  open, 
  onOpenChange, 
  question, 
  instructors, 
  onUpdate, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: any;
  instructors: any[];
  onUpdate: (visibilityType: string, authorizedInstructorIds?: string[]) => void;
  isLoading: boolean;
}) {
  const [visibilityType, setVisibilityType] = useState('all_instructors');
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);

  useEffect(() => {
    if (question) {
      setVisibilityType(question.visibilityType || 'all_instructors');
      setSelectedInstructors(question.authorizedInstructorIds || []);
    }
  }, [question]);

  const handleSave = () => {
    onUpdate(
      visibilityType,
      visibilityType === 'specific_instructors' ? selectedInstructors : undefined
    );
  };

  const toggleInstructor = (instructorId: string) => {
    setSelectedInstructors(prev => 
      prev.includes(instructorId)
        ? prev.filter(id => id !== instructorId)
        : [...prev, instructorId]
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Share Question</AlertDialogTitle>
          <AlertDialogDescription>
            Configure who can use this question in their exams and homework.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Visibility</Label>
            <Select value={visibilityType} onValueChange={setVisibilityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_instructors">All Instructors</SelectItem>
                <SelectItem value="specific_instructors">Specific Instructors Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibilityType === 'specific_instructors' && (
            <div>
              <Label>Authorized Instructors</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                {instructors.map((instructor: any) => (
                  <div key={instructor.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={instructor.id}
                      checked={selectedInstructors.includes(instructor.id)}
                      onChange={() => toggleInstructor(instructor.id)}
                      className="h-4 w-4"
                    />
                    <label htmlFor={instructor.id} className="text-sm">
                      {instructor.firstName} {instructor.lastName} ({instructor.email})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Sharing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}