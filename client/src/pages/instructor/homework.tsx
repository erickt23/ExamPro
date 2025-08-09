import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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

interface HomeworkAssignment {
  id: number;
  title: string;
  description: string;
  subjectId: number;
  dueDate: string | null;
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
  const itemsPerPage = 10;

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
  const { data: homework = [], isLoading: homeworkLoading } = useQuery<HomeworkAssignment[]>({
    queryKey: ["/api/homework", statusFilter === "all" ? undefined : statusFilter, searchTerm],
    enabled: true,
  });

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  
  // Fetch homework questions for selection
  const { data: homeworkQuestions = [] } = useQuery({
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
      setNewHomework({ title: "", description: "", subjectId: "", dueDate: "" });
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
      setNewHomework({ title: "", description: "", subjectId: "", dueDate: "" });
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

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : `Subject ${subjectId}`;
  };

  const filteredHomework = homework.filter(hw => {
    const matchesSearch = hw.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || hw.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Homework Management
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage homework assignments from your dedicated homework question bank
          </p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Homework
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Homework Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newHomework.title}
                  onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                  placeholder="Enter homework title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newHomework.description}
                  onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                  placeholder="Enter homework description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select value={newHomework.subjectId} onValueChange={(value) => setNewHomework({ ...newHomework, subjectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
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
              
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={newHomework.dueDate}
                  onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                />
              </div>
              
              {/* Question Selection Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Homework Questions</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuestionFilters(!showQuestionFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
                
                {/* Search and Filters */}
                <div className="space-y-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search homework questions..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {showQuestionFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
                
                {/* Selected Questions */}
                {selectedQuestions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Selected Questions ({selectedQuestions.length})</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedQuestions.map((question) => (
                        <div key={question.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
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
                            <p className="text-sm text-gray-700 truncate">
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
                  <h4 className="font-medium mb-2">Available Homework Questions</h4>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {homeworkQuestions.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No homework questions found. Create homework questions first in the Homework Questions section.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {homeworkQuestions
                          .filter(q => !selectedQuestions.find(sq => sq.id === q.id))
                          .map((question: any) => (
                          <div key={question.id} className="p-3 hover:bg-gray-50">
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
                                <p className="text-sm text-gray-700 line-clamp-2">
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
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateHomework}
                  disabled={createHomeworkMutation.isPending}
                >
                  {createHomeworkMutation.isPending ? "Creating..." : "Create Homework"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Homework Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Homework Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={newHomework.title}
                  onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                  placeholder="Enter homework title"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={newHomework.description}
                  onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                  placeholder="Enter homework description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-subject">Subject *</Label>
                <Select value={newHomework.subjectId} onValueChange={(value) => setNewHomework({ ...newHomework, subjectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
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
              
              <div>
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="datetime-local"
                  value={newHomework.dueDate}
                  onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                />
              </div>
              
              {/* Question Selection Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select Homework Questions</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuestionFilters(!showQuestionFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
                
                {/* Search and Filters */}
                <div className="space-y-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search homework questions..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {showQuestionFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
                
                {/* Selected Questions */}
                {selectedQuestions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Selected Questions ({selectedQuestions.length})</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedQuestions.map((question) => (
                        <div key={question.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
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
                            <p className="text-sm text-gray-700 truncate">
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
                  <h4 className="font-medium mb-2">Available Homework Questions</h4>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {homeworkQuestions.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No homework questions found. Create homework questions first in the Homework Questions section.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {homeworkQuestions
                          .filter(q => !selectedQuestions.find(sq => sq.id === q.id))
                          .map((question: any) => (
                          <div key={question.id} className="p-3 hover:bg-gray-50">
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
                                <p className="text-sm text-gray-700 line-clamp-2">
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
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
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
                  <p className="text-gray-600">{selectedHomework.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Subject</Label>
                    <p className="mt-1">{subjects.find((s: any) => s.id === selectedHomework.subjectId)?.name || 'Unknown Subject'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <p className="mt-1 capitalize">{selectedHomework.status}</p>
                  </div>
                  
                  {selectedHomework.dueDate && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Due Date</Label>
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
                    <Label className="text-sm font-medium text-gray-500">Created</Label>
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search homework assignments..."
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
            <SelectItem value="all">All Status</SelectItem>
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
        filteredHomework.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No homework assignments found</p>
            <p className="text-gray-400">
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
          // Sort and paginate homework
          const sortedHomework = filteredHomework.sort((a: any, b: any) => {
            // Sort archived homework to the bottom
            if (a.status === 'archived' && b.status !== 'archived') return 1;
            if (b.status === 'archived' && a.status !== 'archived') return -1;
            // Otherwise sort by creation date (newest first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          const totalItems = sortedHomework.length;
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedHomework = sortedHomework.slice(startIndex, endIndex);

          return (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Homework Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                            className={`cursor-pointer hover:bg-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                            onClick={toggleExpanded}
                          >
                            <TableCell>
                              <div className="flex items-center justify-center">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold">{hw.title}</div>
                                <div className="text-sm text-gray-600 line-clamp-1">{hw.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {subjects.find((s: any) => s.id === hw.subjectId)?.name || 'Unknown Subject'}
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
                                      className="text-red-600 focus:text-red-600"
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
                            <TableRow className={`${index % 2 === 0 ? "bg-gray-50" : "bg-gray-100"}`}>
                              <TableCell colSpan={6}>
                                <div className="p-4 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        Assignment Details
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Description:</span>
                                          <span className="font-medium max-w-xs text-right">
                                            {hw.description || 'No description'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Created:</span>
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
                                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Statistics
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Questions:</span>
                                          <span className="font-medium">0</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Submissions:</span>
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
              <div className="flex items-center justify-between px-2">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} assignments
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[2.5rem]"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Homework Question Bank</h4>
            <p className="text-blue-700 text-sm mt-1">
              Homework assignments use a dedicated question bank that never overlaps with exam questions. 
              This ensures homework remains practice-only while keeping exams secure.
            </p>
          </div>
        </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}