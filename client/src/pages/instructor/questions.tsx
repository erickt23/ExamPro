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
  Plus,
  Search,
  Filter,
  Edit,
  Copy,
  Trash2,
  Eye,
  Calendar,
  History,
  BookOpen,
  Upload
} from "lucide-react";
import { QuestionsPagination } from "@/components/ui/questions-pagination";

export default function InstructorQuestions() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    subjectId: "all",
    questionType: "all",
    difficulty: "all",
    search: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });

  const { data: questionsData, isLoading: questionsLoading, error } = useQuery({
    queryKey: ["/api/questions", filters, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.subjectId && filters.subjectId !== 'all') params.append('subject', filters.subjectId);
      if (filters.questionType && filters.questionType !== 'all') params.append('type', filters.questionType);
      if (filters.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
      if (filters.search) params.append('search', filters.search);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      
      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  const questions = questionsData?.questions || [];
  const totalQuestions = questionsData?.total || 0;
  const totalPages = questionsData?.totalPages || 1;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await apiRequest("DELETE", `/api/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Success",
        description: "Question deleted successfully",
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
        description: "Failed to delete question",
        variant: "destructive",
      });
    },
  });

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

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800';
      case 'short_answer': return 'bg-green-100 text-green-800';
      case 'essay': return 'bg-orange-100 text-orange-800';
      case 'fill_blank': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatQuestionType = (type: string) => {
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto ml-0 transition-all duration-300">
          <div className="p-3 md:p-6">
            <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t('nav.questionBank')}</h2>
                <p className="text-gray-600 mt-1 text-sm md:text-base">{t('questions.description')}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={() => setShowImportModal(true)} 
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('questions.importFromExcel')}
                </Button>
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('questions.createQuestion')}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="subject">{t('questions.subject')}</Label>
                    <Select value={filters.subjectId} onValueChange={(value) => setFilters(prev => ({...prev, subjectId: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('questions.allSubjects')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('questions.allSubjects')}</SelectItem>
                        {(subjects as any[]).map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="questionType">{t('questions.type')}</Label>
                    <Select value={filters.questionType} onValueChange={(value) => setFilters(prev => ({...prev, questionType: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('questions.allTypes')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('questions.allTypes')}</SelectItem>
                        <SelectItem value="multiple_choice">{t('questionTypes.multipleChoice')}</SelectItem>
                        <SelectItem value="short_answer">{t('questionTypes.shortAnswer')}</SelectItem>
                        <SelectItem value="essay">{t('questionTypes.essay')}</SelectItem>
                        <SelectItem value="fill_blank">{t('questionTypes.fillInBlank')}</SelectItem>
                        <SelectItem value="matching">{t('questionTypes.matching')}</SelectItem>
                        <SelectItem value="ranking">{t('questionTypes.ranking')}</SelectItem>
                        <SelectItem value="drag_drop">{t('questionTypes.dragAndDrop')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="difficulty">{t('questions.difficulty')}</Label>
                    <Select value={filters.difficulty} onValueChange={(value) => setFilters(prev => ({...prev, difficulty: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('questions.allLevels')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('questions.allLevels')}</SelectItem>
                        <SelectItem value="easy">{t('difficulty.easy')}</SelectItem>
                        <SelectItem value="medium">{t('difficulty.medium')}</SelectItem>
                        <SelectItem value="hard">{t('difficulty.hard')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="search">{t('questions.search')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('questions.searchPlaceholder')}
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('questions.questions')} ({totalQuestions})</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">{t('questions.export')}</Button>
                    <Button variant="outline" size="sm">{t('questions.import')}</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {questionsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-6 border border-gray-200 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">{t('questions.noQuestions')}</p>
                    <p className="text-gray-400">{t('questions.createFirst')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {questions.map((question: any) => (
                      <div key={question.id} className="p-6 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Badge className={getQuestionTypeColor(question.questionType)}>
                                {formatQuestionType(question.questionType)}
                              </Badge>
                              <Badge variant="outline">
                                {(subjects as any[]).find((s: any) => s.id === question.subjectId)?.name || t('studentExams.unknownSubject')}
                              </Badge>
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                              </Badge>
                              {question.bloomsTaxonomy && (
                                <Badge variant="outline" className="capitalize bg-indigo-100 text-indigo-800">
                                  {question.bloomsTaxonomy}
                                </Badge>
                              )}
                              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                {question.points} pts
                              </Badge>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2">{question.title || question.questionText.substring(0, 100)}</h4>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {question.questionText}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Eye className="h-4 w-4 mr-1" />
                                Used {question.usageCount} times
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Created: {formatSubmissionTime(question.createdAt)}
                              </span>
                              <span className="flex items-center">
                                <History className="h-4 w-4 mr-1" />
                                Version {question.version}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setEditQuestionId(question.id);
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteQuestionMutation.mutate(question.id)}
                              disabled={deleteQuestionMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {questions.length > 0 && (
                  <QuestionsPagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    total={totalQuestions}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newPageSize) => {
                      setPageSize(newPageSize);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

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
    </div>
  );
}
