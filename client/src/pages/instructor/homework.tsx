import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { convertToDateTimeLocalValue, convertFromDateTimeLocalValue } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Plus, Search, Clock, Users, Eye, Edit, CheckCircle, X, Filter, ChevronDown, ChevronRight, ChevronLeft, MoreVertical, FileText, Archive, Trash2 } from "lucide-react";
import { QuestionsPagination } from "@/components/ui/questions-pagination";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StudentSelector from "@/components/student-selector";

interface HomeworkAssignment {
  id: number;
  title: string;
  description: string;
  subjectId: number;
  dueDate: string | null;
  totalPoints: number;
  attemptsAllowed: number;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
}

interface Subject {
  id: number;
  name: string;
  description?: string;
}

export default function InstructorHomeworkPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<HomeworkAssignment | null>(null);
  const [newHomework, setNewHomework] = useState({
    title: "",
    description: "",
    subjectId: "",
    dueDate: "",
    totalPoints: 0,
    attemptsAllowed: 1,
  });
  
  // Question selection state
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionFilters, setQuestionFilters] = useState({
    subjectId: "all",
    questionType: "all",
    difficulty: "all",
  });
  const [showQuestionFilters, setShowQuestionFilters] = useState(false);
  const [expandedHomeworkIds, setExpandedHomeworkIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate total points automatically based on selected questions
  useEffect(() => {
    const totalPoints = selectedQuestions.reduce((sum, question) => sum + (question.points || 1), 0);
    setNewHomework(prev => ({ ...prev, totalPoints }));
  }, [selectedQuestions]);

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

  // Fetch homework assignments
  const { data: homeworkData, isLoading: homeworkLoading } = useQuery({
    queryKey: ["/api/homework", statusFilter === "all" ? undefined : statusFilter, searchTerm, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      
      const response = await fetch(`/api/homework?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: true,
  });

  const homework = homeworkData?.homeworkAssignments || homeworkData || [];
  const totalHomework = homeworkData?.total || homework?.length || 0;
  const totalPages = homeworkData?.totalPages || 1;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  
  // Fetch homework questions for selection
  const { data: homeworkQuestionsData } = useQuery({
    queryKey: ["/api/questions", questionFilters, questionSearch, "homework"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (questionFilters.subjectId && questionFilters.subjectId !== 'all') params.append('subject', questionFilters.subjectId);
      if (questionFilters.questionType && questionFilters.questionType !== 'all') params.append('type', questionFilters.questionType);
      if (questionFilters.difficulty && questionFilters.difficulty !== 'all') params.append('difficulty', questionFilters.difficulty);
      if (questionSearch) params.append('search', questionSearch);
      params.append('category', 'homework'); // Only fetch homework questions
      
      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    enabled: showCreateModal || showEditModal, // Fetch when either modal is open
  });

  const homeworkQuestions = homeworkQuestionsData?.questions || [];

  // Fetch existing homework questions when editing
  const { data: existingHomeworkQuestions = [] } = useQuery({
    queryKey: ["/api/homework", selectedHomework?.id, "questions"],
    queryFn: async () => {
      if (!selectedHomework?.id) return [];
      const response = await fetch(`/api/homework/${selectedHomework.id}/questions`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!selectedHomework?.id && showEditModal,
  });

  // Create homework mutation
  const createHomeworkMutation = useMutation({
    mutationFn: async (homeworkData: any) => {
      // First create the homework assignment
      const response = await fetch("/api/homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(homeworkData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`${response.status}: ${errorData.message || response.statusText}`);
      }
      
      const homeworkResult = await response.json();
      
      // Add selected questions to homework
      if (selectedQuestions.length > 0) {
        for (let i = 0; i < selectedQuestions.length; i++) {
          const question = selectedQuestions[i];
          await apiRequest("POST", `/api/homework/${homeworkResult.id}/questions`, {
            questionId: question.id,
            order: i + 1,
            points: question.points || 1,
          });
        }
      }
      
      return homeworkResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      setShowCreateModal(false);
      setNewHomework({ title: "", description: "", subjectId: "", dueDate: "", totalPoints: 0, attemptsAllowed: 1 });
      setSelectedQuestions([]);
      setQuestionSearch("");
      setQuestionFilters({ subjectId: "all", questionType: "all", difficulty: "all" });
      setShowQuestionFilters(false);
      toast({
        title: "Success",
        description: "Homework assignment created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update homework mutation
  const updateHomeworkMutation = useMutation({
    mutationFn: async ({ id, homeworkData }: { id: number; homeworkData: any }) => {
      // First update the homework assignment
      const response = await fetch(`/api/homework/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(homeworkData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`${response.status}: ${errorData.message || response.statusText}`);
      }
      
      // Remove existing homework questions
      await apiRequest("DELETE", `/api/homework/${id}/questions`);
      
      // Add updated questions to homework
      if (selectedQuestions.length > 0) {
        for (let i = 0; i < selectedQuestions.length; i++) {
          const question = selectedQuestions[i];
          await apiRequest("POST", `/api/homework/${id}/questions`, {
            questionId: question.id,
            order: i + 1,
            points: question.points || 1,
          });
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      queryClient.invalidateQueries({ queryKey: ["/api/homework", selectedHomework?.id, "questions"] });
      setShowEditModal(false);
      setSelectedHomework(null);
      setNewHomework({ title: "", description: "", subjectId: "", dueDate: "", totalPoints: 0, attemptsAllowed: 1 });
      setSelectedQuestions([]);
      setQuestionSearch("");
      setQuestionFilters({ subjectId: "all", questionType: "all", difficulty: "all" });
      setShowQuestionFilters(false);
      toast({
        title: "Success",
        description: "Homework assignment updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Publish homework mutation
  const publishHomeworkMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/homework/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "active" }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`${response.status}: ${errorData.message || response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      toast({
        title: "Success",
        description: "Homework assignment published successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateHomework = () => {
    if (!newHomework.title || !newHomework.subjectId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (selectedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one homework question",
        variant: "destructive",
      });
      return;
    }

    const dueDate = newHomework.dueDate ? convertFromDateTimeLocalValue(newHomework.dueDate) : null;
    
    createHomeworkMutation.mutate({
      title: newHomework.title,
      description: newHomework.description,
      subjectId: parseInt(newHomework.subjectId),
      dueDate: dueDate,
      totalPoints: newHomework.totalPoints,
      attemptsAllowed: newHomework.attemptsAllowed,
      status: "draft",
    });
  };

  const handleEditHomework = () => {
    if (!selectedHomework || !newHomework.title || !newHomework.subjectId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (selectedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one homework question",
        variant: "destructive",
      });
      return;
    }

    const dueDate = newHomework.dueDate ? convertFromDateTimeLocalValue(newHomework.dueDate) : null;
    
    updateHomeworkMutation.mutate({
      id: selectedHomework.id,
      homeworkData: {
        title: newHomework.title,
        description: newHomework.description,
        subjectId: parseInt(newHomework.subjectId),
        dueDate: dueDate,
        totalPoints: newHomework.totalPoints,
        attemptsAllowed: newHomework.attemptsAllowed,
      },
    });
  };

  const handleViewDetails = (homework: HomeworkAssignment) => {
    setSelectedHomework(homework);
    setShowDetailsModal(true);
  };

  const handleEditClick = (homework: HomeworkAssignment) => {
    setSelectedHomework(homework);
    setNewHomework({
      title: homework.title,
      description: homework.description,
      subjectId: homework.subjectId.toString(),
      dueDate: convertToDateTimeLocalValue(homework.dueDate),
      totalPoints: homework.totalPoints || 0,
      attemptsAllowed: homework.attemptsAllowed || 1,
    });
    // Reset question selection state
    setSelectedQuestions([]);
    setQuestionSearch("");
    setQuestionFilters({ subjectId: "all", questionType: "all", difficulty: "all" });
    setShowQuestionFilters(false);
    setShowEditModal(true);
  };

  const handlePublish = (homeworkId: number) => {
    publishHomeworkMutation.mutate(homeworkId);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      active: "default",
      archived: "outline",
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  // Question selection helper functions
  const addQuestion = (question: any) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const removeQuestion = (questionId: number) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  const formatQuestionType = (type: string) => {
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'short_answer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'essay': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'fill_blank': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : `Subject ${subjectId}`;
  };

  // Filtering is now handled server-side through the API

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto ml-0 transition-all duration-300">
          <div className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="h-8 w-8" />
                  {t('nav.assignments')}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {t('assignments.description')}
                </p>
              </div>
              
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('assignments.createAssignment')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('assignments.createNewHomeworkAssignment')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <Collapsible defaultOpen={true}>
                      <CollapsibleTrigger className="flex justify-between items-center w-full">
                        <h3 className="text-lg font-semibold">Section 1: Assignment Details</h3>
                        <ChevronDown className="h-5 w-5" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-6 pt-4">
                        <div>
                          <Label htmlFor="title">{t('assignments.title')} *</Label>
                          <Input
                            id="title"
                            value={newHomework.title}
                            onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                            placeholder={t('assignments.homeworkTitlePlaceholder')}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="description">{t('assignments.assignmentDescription')}</Label>
                          <Textarea
                            id="description"
                            value={newHomework.description}
                            onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                            placeholder={t('assignments.homeworkDescriptionPlaceholder')}
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="subject">{t('assignments.subject')} *</Label>
                          <Select value={newHomework.subjectId} onValueChange={(value) => setNewHomework({ ...newHomework, subjectId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('assignments.selectSubject')} />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="dueDate">{t('assignments.dueDate')}</Label>
                            <Input
                              id="dueDate"
                              type="datetime-local"
                              value={newHomework.dueDate}
                              onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="attemptsAllowed">{t('assignments.attemptsAllowed')}</Label>
                            <Input
                              id="attemptsAllowed"
                              type="number"
                              min="1"
                              max="10"
                              value={newHomework.attemptsAllowed}
                              onChange={(e) => setNewHomework({ ...newHomework, attemptsAllowed: parseInt(e.target.value) || 1 })}
                              placeholder="1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('assignments.defaultOneAttempt')}
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="totalPoints">{t('assignments.totalPoints')}</Label>
                            <div className="relative">
                              <Input
                                id="totalPoints"
                                type="number"
                                min="0"
                                value={newHomework.totalPoints}
                                readOnly
                                className="bg-muted/50"
                                placeholder={t('assignments.automaticallyCalculated')}
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <Badge variant="secondary" className="text-xs">
                                  {t('assignments.auto')}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('assignments.automaticallyCalculated')}
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    
                    <Collapsible>
                      <CollapsibleTrigger className="flex justify-between items-center w-full">
                        <h3 className="text-lg font-semibold">Section 2: Select Homework Questions</h3>
                        <ChevronDown className="h-5 w-5" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-6 pt-4">
                        {/* Question Selection Section */}
                        <div className="border-t pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{t('assignments.selectHomeworkQuestions')}</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowQuestionFilters(!showQuestionFilters)}
                            >
                              <Filter className="h-4 w-4 mr-2" />
                              {t('assignments.filters')}
                            </Button>
                          </div>
                          
                          {/* Search and Filters */}
                          <div className="space-y-4 mb-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder={t('assignments.searchHomeworkAssignments')}
                                value={questionSearch}
                                onChange={(e) => setQuestionSearch(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                            
                            {showQuestionFilters && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                  <Label>Subject</Label>
                                  <Select value={questionFilters.subjectId} onValueChange={(value) => setQuestionFilters(prev => ({...prev, subjectId: value}))}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="All Subjects" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Subjects</SelectItem>
                                      {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Question Type</Label>
                                  <Select value={questionFilters.questionType} onValueChange={(value) => setQuestionFilters(prev => ({...prev, questionType: value}))}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Types</SelectItem>
                                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                      <SelectItem value="short_answer">Short Answer</SelectItem>
                                      <SelectItem value="essay">Essay</SelectItem>
                                      <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Difficulty</Label>
                                  <Select value={questionFilters.difficulty} onValueChange={(value) => setQuestionFilters(prev => ({...prev, difficulty: value}))}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="All Levels" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Levels</SelectItem>
                                      <SelectItem value="easy">Easy</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Selected Questions Summary */}
                          {selectedQuestions.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">{t('assignments.selectedQuestions')} ({selectedQuestions.length})</h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-sm">
                                    Total: {newHomework.totalPoints} points
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedQuestions.map((question) => (
                                  <div key={question.id} className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className={getQuestionTypeColor(question.questionType)}>
                                          {formatQuestionType(question.questionType)}
                                        </Badge>
                                        <Badge className={getDifficultyColor(question.difficulty)}>
                                          {question.difficulty}
                                        </Badge>
                                        <Badge variant="outline">{question.points} pts</Badge>
                                      </div>
                                      <p className="text-sm text-foreground truncate">
                                        {question.title || question.questionText}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeQuestion(question.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Available Questions */}
                          <div>
                            <h4 className="font-medium mb-2">{t('assignments.availableHomeworkQuestions')}</h4>
                            <div className="border rounded-lg max-h-60 overflow-y-auto">
                              {homeworkQuestions.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                  No homework questions found. Create homework questions first in the Homework Questions section.
                                </div>
                              ) : (
                                <div className="divide-y">
                                  {homeworkQuestions
                                    .filter((q: any) => !selectedQuestions.find(sq => sq.id === q.id))
                                    .map((question: any) => (
                                    <div key={question.id} className="p-3 hover:bg-muted">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge className={getQuestionTypeColor(question.questionType)}>
                                              {formatQuestionType(question.questionType)}
                                            </Badge>
                                            <Badge variant="outline">
                                              {getSubjectName(question.subjectId)}
                                            </Badge>
                                            <Badge className={getDifficultyColor(question.difficulty)}>
                                              {question.difficulty}
                                            </Badge>
                                            <Badge variant="outline">{question.points} pts</Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            {question.title || question.questionText}
                                          </p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addQuestion(question)}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                        {t('assignments.cancel')}
                      </Button>
                      <Button 
                        onClick={handleCreateHomework}
                        disabled={createHomeworkMutation.isPending}
                      >
                        {createHomeworkMutation.isPending ? t('common.creating') : t('assignments.createHomework')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit Homework Modal */}
              <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('assignments.editHomeworkAssignment')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="edit-title">{t('assignments.title')} *</Label>
                      <Input
                        id="edit-title"
                        value={newHomework.title}
                        onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                        placeholder={t('assignments.homeworkTitlePlaceholder')}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-description">{t('assignments.assignmentDescription')}</Label>
                      <Textarea
                        id="edit-description"
                        value={newHomework.description}
                        onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                        placeholder={t('assignments.homeworkDescriptionPlaceholder')}
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-subject">{t('assignments.subject')} *</Label>
                      <Select value={newHomework.subjectId} onValueChange={(value) => setNewHomework({ ...newHomework, subjectId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assignments.selectSubject')} />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="edit-dueDate">{t('assignments.dueDate')}</Label>
                        <Input
                          id="edit-dueDate"
                          type="datetime-local"
                          value={newHomework.dueDate}
                          onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-attemptsAllowed">{t('assignments.attemptsAllowed')}</Label>
                        <Input
                          id="edit-attemptsAllowed"
                          type="number"
                          min="1"
                          max="10"
                          value={newHomework.attemptsAllowed}
                          onChange={(e) => setNewHomework({ ...newHomework, attemptsAllowed: parseInt(e.target.value) || 1 })}
                          placeholder="1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('assignments.defaultOneAttempt')}
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-totalPoints">{t('assignments.totalPoints')}</Label>
                        <div className="relative">
                          <Input
                            id="edit-totalPoints"
                            type="number"
                            min="0"
                            value={newHomework.totalPoints}
                            readOnly
                            className="bg-muted/50"
                            placeholder={t('assignments.automaticallyCalculated')}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <Badge variant="secondary" className="text-xs">
                              {t('assignments.auto')}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('assignments.automaticallyCalculated')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Question Selection Section */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{t('assignments.selectHomeworkQuestions')}</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQuestionFilters(!showQuestionFilters)}
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          {t('assignments.filters')}
                        </Button>
                      </div>
                      
                      {/* Search and Filters */}
                      <div className="space-y-4 mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={t('assignments.searchHomeworkAssignments')}
                            value={questionSearch}
                            onChange={(e) => setQuestionSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        
                        {showQuestionFilters && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div>
                              <Label>Subject</Label>
                              <Select value={questionFilters.subjectId} onValueChange={(value) => setQuestionFilters(prev => ({...prev, subjectId: value}))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="All Subjects" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Subjects</SelectItem>
                                  {subjects.map((subject) => (
                                    <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Question Type</Label>
                              <Select value={questionFilters.questionType} onValueChange={(value) => setQuestionFilters(prev => ({...prev, questionType: value}))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Types</SelectItem>
                                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                  <SelectItem value="short_answer">Short Answer</SelectItem>
                                  <SelectItem value="essay">Essay</SelectItem>
                                  <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Difficulty</Label>
                              <Select value={questionFilters.difficulty} onValueChange={(value) => setQuestionFilters(prev => ({...prev, difficulty: value}))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="All Levels" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Levels</SelectItem>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Selected Questions Summary */}
                      {selectedQuestions.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{t('assignments.selectedQuestions')} ({selectedQuestions.length})</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-sm">
                                Total: {newHomework.totalPoints} points
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedQuestions.map((question) => (
                              <div key={question.id} className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={getQuestionTypeColor(question.questionType)}>
                                      {formatQuestionType(question.questionType)}
                                    </Badge>
                                    <Badge className={getDifficultyColor(question.difficulty)}>
                                      {question.difficulty}
                                    </Badge>
                                    <Badge variant="outline">{question.points} pts</Badge>
                                  </div>
                                  <p className="text-sm text-foreground truncate">
                                    {question.title || question.questionText}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeQuestion(question.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Available Questions */}
                      <div>
                        <h4 className="font-medium mb-2">{t('assignments.availableHomeworkQuestions')}</h4>
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                          {homeworkQuestions.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              No homework questions found. Create homework questions first in the Homework Questions section.
                            </div>
                          ) : (
                            <div className="divide-y">
                              {homeworkQuestions
                                .filter((q: any) => !selectedQuestions.find(sq => sq.id === q.id))
                                .map((question: any) => (
                                <div key={question.id} className="p-3 hover:bg-muted">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className={getQuestionTypeColor(question.questionType)}>
                                          {formatQuestionType(question.questionType)}
                                        </Badge>
                                        <Badge variant="outline">
                                          {getSubjectName(question.subjectId)}
                                        </Badge>
                                        <Badge className={getDifficultyColor(question.difficulty)}>
                                          {question.difficulty}
                                        </Badge>
                                        <Badge variant="outline">{question.points} pts</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {question.title || question.questionText}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addQuestion(question)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Student Assignment Section */}
                    <div className="mt-6">
                      <StudentSelector
                        assignmentId={selectedHomework?.id || null}
                        assignmentType="homework"
                        onAssignmentsChange={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/homework", selectedHomework?.id, "assigned-students"] });
                        }}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEditModal(false)}
                      >
                        {t('assignments.cancel')}
                      </Button>
                      <Button
                        onClick={handleEditHomework}
                        disabled={updateHomeworkMutation.isPending}
                      >
                        {updateHomeworkMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* View Details Modal */}
              <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Homework Details</DialogTitle>
                  </DialogHeader>
                  {selectedHomework && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold">{selectedHomework.title}</h3>
                          {getStatusBadge(selectedHomework.status)}
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-foreground text-justify leading-relaxed">
                          {selectedHomework.description || 'No description provided for this assignment.'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                          <p className="mt-1">{subjects.find((s: any) => s.id === selectedHomework.subjectId)?.name || t('studentExams.unknownSubject')}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <p className="mt-1 capitalize">{selectedHomework.status}</p>
                        </div>
                        
                        {selectedHomework.dueDate && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                            <p className="mt-1">{new Date(selectedHomework.dueDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</p>
                          </div>
                        )}
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                          <p className="mt-1">{new Date(selectedHomework.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                          Close
                        </Button>
                        <Button onClick={() => {
                          setShowDetailsModal(false);
                          handleEditClick(selectedHomework);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Homework
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('assignments.searchHomeworkAssignments')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('assignments.allStatus')}</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Homework Assignments List */}
            {homeworkLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              homework.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">No homework assignments found</p>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" 
                      ? "Try adjusting your search or filter criteria"
                      : "Create your first homework assignment to get started"
                    }
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Homework
                    </Button>
                  )}
                </div>
              ) : (() => {
                // Display homework (sorting and pagination handled server-side)
                const paginatedHomework = homework;

                return (
                  <div className="space-y-4">
                    <div className="bg-card rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>{t('homeworkTitle')}</TableHead>
                            <TableHead>{t('subject')}</TableHead>
                            <TableHead>{t('dueDate')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                            <TableHead className="text-right">{t('actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedHomework.map((hw: any, index: number) => {
                            const isExpanded = expandedHomeworkIds.has(hw.id);
                            const toggleExpanded = () => {
                              const newExpanded = new Set(expandedHomeworkIds);
                              if (isExpanded) {
                                newExpanded.delete(hw.id);
                              } else {
                                newExpanded.add(hw.id);
                              }
                              setExpandedHomeworkIds(newExpanded);
                            };

                            return (
                              <>
                                <TableRow 
                                  key={hw.id} 
                                  className={`cursor-pointer hover:bg-muted`}
                                  onClick={toggleExpanded}
                                >
                                  <TableCell>
                                    <div className="flex items-center justify-center">
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div className="font-semibold truncate max-w-xs text-foreground" title={hw.title}>
                                      {hw.title}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {subjects.find((s: any) => s.id === hw.subjectId)?.name || t('studentExams.unknownSubject')}
                                  </TableCell>
                                  <TableCell>
                                    {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'No due date'}
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(hw.status)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleViewDetails(hw)}
                                        title="View details"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" title="More actions">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleEditClick(hw)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Homework
                                          </DropdownMenuItem>
                                          {hw.status === 'draft' && (
                                            <DropdownMenuItem 
                                              onClick={() => handlePublish(hw.id)}
                                              disabled={publishHomeworkMutation.isPending}
                                            >
                                              <CheckCircle className="h-4 w-4 mr-2" />
                                              Publish
                                            </DropdownMenuItem>
                                          )}
                                          {(hw.status === 'active' || hw.status === 'completed') && (
                                            <DropdownMenuItem onClick={() => console.log('Archive', hw.id)}>
                                              <Archive className="h-4 w-4 mr-2" />
                                              Archive Homework
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem 
                                            onClick={() => console.log('Delete', hw.id)}
                                            className="text-destructive focus:text-destructive-foreground"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Homework
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Expanded Details Row */}
                                {isExpanded && (
                                  <TableRow className="bg-muted/50">
                                    <TableCell colSpan={6}>
                                      <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div className="space-y-3">
                                            <h4 className="font-medium text-foreground flex items-center gap-2">
                                              <BookOpen className="h-4 w-4" />
                                              {t('assignmentDetails')}
                                            </h4>
                                            <div className="space-y-3 text-sm">
                                              <div>
                                                <span className="text-muted-foreground font-medium">{t('descriptionLabel')}</span>
                                                <div className="mt-2 p-3 bg-muted/50 rounded-lg text-foreground text-justify leading-relaxed">
                                                  {hw.description || t('noDescriptionProvided')}
                                                </div>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Created:</span>
                                                <span className="font-medium">
                                                  {new Date(hw.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                  })}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="space-y-3">
                                            <h4 className="font-medium text-foreground flex items-center gap-2">
                                              <Users className="h-4 w-4" />
                                              {t('statistics')}
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('questions')}</span>
                                                <span className="font-medium">0</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Submissions:</span>
                                                <span className="font-medium">0</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {homework.length > 0 && (
                      <QuestionsPagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        total={totalHomework}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(newPageSize) => {
                          setPageSize(newPageSize);
                          setCurrentPage(1);
                        }}
                      />
                    )}
                  </div>
                );
              })()
            )}

          </div>
        </main>
      </div>
    </div>
  );
}