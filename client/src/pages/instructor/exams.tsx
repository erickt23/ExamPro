import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatEasternTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import CreateExamModal from "@/components/modals/create-exam-modal";
import EditExamModal from "@/components/modals/edit-exam-modal";
import ExamPreviewModal from "@/components/modals/exam-preview-modal";
import ExamResultsModal from "@/components/modals/exam-results-modal";
import AddExtraTimeModal from "@/components/modals/add-extra-time-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus,
  FileText,
  Edit,
  Copy,
  Calendar,
  Users,
  Clock,
  Play,
  Trash2,
  Eye,
  Archive,
  MoreVertical,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InstructorExams() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [previewingExamId, setPreviewingExamId] = useState<number | null>(null);
  const [viewingResultsExamId, setViewingResultsExamId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [deletingExamId, setDeletingExamId] = useState<number | null>(null);
  const [archivingExamId, setArchivingExamId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedExamIds, setExpandedExamIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [addingTimeExamId, setAddingTimeExamId] = useState<number | null>(null);

  // Check URL parameters for auto-opening modals
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
      setShowCreateModal(true);
      // Clean up URL by removing only the create parameter
      urlParams.delete('create');
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

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

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["/api/exams", activeTab !== "all" ? { status: activeTab } : undefined, searchTerm ? { search: searchTerm } : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.append('status', activeTab);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await fetch(`/api/exams?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  // Publish exam mutation
  const publishExamMutation = useMutation({
    mutationFn: async (examId: number) => {
      await apiRequest("PUT", `/api/exams/${examId}`, { status: "active" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam published successfully",
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
        description: "Failed to publish exam",
        variant: "destructive",
      });
    },
  });

  // Archive exam mutation
  const archiveExamMutation = useMutation({
    mutationFn: async (examId: number) => {
      await apiRequest("PUT", `/api/exams/${examId}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam archived successfully",
      });
      setArchivingExamId(null);
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
        description: "Failed to archive exam",
        variant: "destructive",
      });
      setArchivingExamId(null);
    },
  });

  // Delete exam mutation
  const deleteExamMutation = useMutation({
    mutationFn: async (examId: number) => {
      await apiRequest("DELETE", `/api/exams/${examId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam deleted successfully",
      });
      setDeletingExamId(null);
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
      const errorMessage = error.message.includes("submissions") 
        ? "Cannot delete exam with existing submissions. Archive it instead."
        : "Failed to delete exam";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setDeletingExamId(null);
    },
  });

  const handleEditExam = (examId: number) => {
    setEditingExamId(examId);
    setShowEditModal(true);
  };

  const handlePreviewExam = (examId: number) => {
    setPreviewingExamId(examId);
    setShowPreviewModal(true);
  };

  const handleViewResults = (examId: number) => {
    setViewingResultsExamId(examId);
    setShowResultsModal(true);
  };

  const handlePublishExam = (examId: number) => {
    publishExamMutation.mutate(examId);
  };

  const handleAddExtraTime = (examId: number) => {
    setAddingTimeExamId(examId);
    setShowAddTimeModal(true);
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'draft': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'scheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return formatEasternTime(dateString, {
      includeTime: true,
      includeDate: true,
      format: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto ml-0 transition-all duration-300">
          <div className="p-3 md:p-6">
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('nav.exams')}</h2>
                  <p className="text-muted-foreground mt-1">{t('exams.description')}</p>
                </div>
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('exams.createExam')}
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('exams.searchExams')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Exam Status Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">{t('exams.allExams')}</TabsTrigger>
                <TabsTrigger value="active">{t('exams.active')}</TabsTrigger>
                <TabsTrigger value="draft">{t('exams.draft')}</TabsTrigger>
                <TabsTrigger value="completed">{t('exams.completed')}</TabsTrigger>
                <TabsTrigger value="scheduled">{t('exams.scheduled')}</TabsTrigger>
                <TabsTrigger value="archived">{t('exams.archived')}</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {examsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-4 bg-muted rounded mb-4"></div>
                          <div className="h-3 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : exams?.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg mb-2">{t('exams.noExams')}</p>
                    <p className="text-muted-foreground">{t('exams.createFirstExam')}</p>
                  </div>
                ) : (() => {
                  // Sort and paginate exams
                  const sortedExams = exams?.sort((a: any, b: any) => {
                    // Sort archived exams to the bottom
                    if (a.status === 'archived' && b.status !== 'archived') return 1;
                    if (b.status === 'archived' && a.status !== 'archived') return -1;
                    // Otherwise sort by creation date (newest first)
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  }) || [];
                  
                  const totalItems = sortedExams.length;
                  const totalPages = Math.ceil(totalItems / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedExams = sortedExams.slice(startIndex, endIndex);

                  return (
                    <div className="space-y-4">
                      <div className="bg-card rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]"></TableHead>
                              <TableHead>{t('exams.examTitle')}</TableHead>
                              <TableHead>{t('exams.startDate')}</TableHead>
                              <TableHead>{t('exams.time')}</TableHead>
                              <TableHead>{t('exams.duration')}</TableHead>
                              <TableHead>{t('exams.status')}</TableHead>
                              <TableHead className="text-right">{t('exams.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedExams.map((exam: any, index: number) => {
                          const isExpanded = expandedExamIds.has(exam.id);
                          const toggleExpanded = () => {
                            const newExpanded = new Set(expandedExamIds);
                            if (isExpanded) {
                              newExpanded.delete(exam.id);
                            } else {
                              newExpanded.add(exam.id);
                            }
                            setExpandedExamIds(newExpanded);
                          };

                          return (
                            <>
                              <TableRow 
                                key={exam.id} 
                                className={`cursor-pointer hover:bg-muted`}
                                onClick={toggleExpanded}
                              >
                                <TableCell>
                                  <Button variant="ghost" size="sm">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-foreground">{exam.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || t('studentExams.unknownSubject')} • {exam.totalPoints} points
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {exam.availableFrom ? formatDate(exam.availableFrom) : 'Not set'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {exam.availableFrom ? formatEasternTime(exam.availableFrom, { includeTime: true }) : 'Not set'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm font-medium">{exam.duration} min</div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(exam.status)}>
                                    {exam.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleViewResults(exam.id)}
                                      title="View results"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handlePreviewExam(exam.id)}
                                      title="Preview exam"
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
                                        <DropdownMenuItem onClick={() => handleEditExam(exam.id)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit Exam
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEditExam(exam.id)}>
                                          <Copy className="h-4 w-4 mr-2" />
                                          Duplicate Exam
                                        </DropdownMenuItem>
                                        {exam.status === 'active' && (
                                          <DropdownMenuItem onClick={() => handleAddExtraTime(exam.id)}>
                                            <Clock className="h-4 w-4 mr-2" />
                                            Add Extra Time
                                          </DropdownMenuItem>
                                        )}
                                        {(exam.status === 'active' || exam.status === 'completed') && (
                                          <DropdownMenuItem onClick={() => setArchivingExamId(exam.id)}>
                                            <Archive className="h-4 w-4 mr-2" />
                                            Archive Exam
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem 
                                          onClick={() => setDeletingExamId(exam.id)}
                                          className="text-destructive focus:text-destructive-foreground"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Exam
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                              
                              {/* Expanded Details Row */}
                              {isExpanded && (
                                <TableRow className="bg-muted/50">
                                  <TableCell colSpan={7}>
                                    <div className="p-4 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-3">
                                          <h4 className="font-medium text-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Schedule
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Available From:</span>
                                              <span className="font-medium">
                                                {exam.availableFrom ? formatEasternTime(exam.availableFrom) : 'Not set'}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Available Until:</span>
                                              <span className="font-medium">
                                                {exam.availableUntil ? formatEasternTime(exam.availableUntil) : 'Not set'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                          <h4 className="font-medium text-foreground flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Configuration
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Attempts:</span>
                                              <span className="font-medium">
                                                {exam.attemptsAllowed === -1 ? 'Unlimited' : exam.attemptsAllowed}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Password:</span>
                                              <span className="font-medium">
                                                {exam.password ? 'Protected' : 'None'}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Random Order:</span>
                                              <span className="font-medium">
                                                {exam.randomizeQuestions ? 'Yes' : 'No'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                          <h4 className="font-medium text-foreground flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Statistics
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Questions:</span>
                                              <span className="font-medium">{exam.questionCount || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Submissions:</span>
                                              <span className="font-medium">{exam.submissionCount || 0}</span>
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
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} exams
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
                })()}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <CreateExamModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />
      
      <EditExamModal
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditingExamId(null);
          }
        }}
        examId={editingExamId}
      />
      
      <ExamPreviewModal
        open={showPreviewModal}
        onOpenChange={(open) => {
          setShowPreviewModal(open);
          if (!open) {
            setPreviewingExamId(null);
          }
        }}
        examId={previewingExamId}
        onPublish={() => {
          // Refresh exams list after publishing
          queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
        }}
      />
      
      <ExamResultsModal
        open={showResultsModal}
        onOpenChange={(open) => {
          setShowResultsModal(open);
          if (!open) {
            setViewingResultsExamId(null);
          }
        }}
        examId={viewingResultsExamId}
      />

      <AddExtraTimeModal
        isOpen={showAddTimeModal}
        onClose={() => {
          setShowAddTimeModal(false);
          setAddingTimeExamId(null);
        }}
        examId={addingTimeExamId}
        examTitle={addingTimeExamId ? exams?.find((e: any) => e.id === addingTimeExamId)?.title : undefined}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archivingExamId} onOpenChange={() => setArchivingExamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this exam? Archived exams will be marked as completed and students will no longer be able to access them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archivingExamId && archiveExamMutation.mutate(archivingExamId)}
              disabled={archiveExamMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {archiveExamMutation.isPending ? "Archiving..." : "Archive Exam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingExamId} onOpenChange={() => setDeletingExamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exam? This action cannot be undone. All exam data and student submissions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingExamId && deleteExamMutation.mutate(deletingExamId)}
              disabled={deleteExamMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteExamMutation.isPending ? "Deleting..." : "Delete Exam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}