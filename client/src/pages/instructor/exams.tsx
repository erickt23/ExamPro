import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import CreateExamModal from "@/components/modals/create-exam-modal";
import EditExamModal from "@/components/modals/edit-exam-modal";
import ExamPreviewModal from "@/components/modals/exam-preview-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MoreVertical
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [previewingExamId, setPreviewingExamId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [deletingExamId, setDeletingExamId] = useState<number | null>(null);
  const [archivingExamId, setArchivingExamId] = useState<number | null>(null);

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
    queryKey: ["/api/exams", activeTab !== "all" ? { status: activeTab } : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.append('status', activeTab);
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

  const handlePublishExam = (examId: number) => {
    publishExamMutation.mutate(examId);
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
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
                <p className="text-gray-600 mt-1">Create, schedule, and manage your exams</p>
              </div>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </Button>
            </div>

            {/* Exam Status Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All Exams</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {examsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-4 bg-gray-200 rounded mb-4"></div>
                          <div className="h-3 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : exams?.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No exams found</p>
                    <p className="text-gray-400">Create your first exam to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams?.sort((a: any, b: any) => {
                      // Sort archived exams to the bottom
                      if (a.status === 'archived' && b.status !== 'archived') return 1;
                      if (b.status === 'archived' && a.status !== 'archived') return -1;
                      // Otherwise sort by creation date (newest first)
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })?.map((exam: any) => (
                      <Card key={exam.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">{exam.title}</h3>
                              <p className="text-sm text-gray-600">{(subjects as any[]).find((s: any) => s.id === exam.subjectId)?.name || 'Unknown Subject'} • {exam.totalPoints} points</p>
                            </div>
                            <Badge className={getStatusColor(exam.status)}>
                              {exam.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Duration:</span>
                              <span className="font-medium">{exam.duration} minutes</span>
                            </div>
                            {exam.availableFrom && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Start Date:</span>
                                <span className="font-medium">{formatDate(exam.availableFrom)}</span>
                              </div>
                            )}
                            {exam.availableUntil && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">End Date:</span>
                                <span className="font-medium">{formatDate(exam.availableUntil)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Attempts:</span>
                              <span className="font-medium">
                                {exam.attemptsAllowed === -1 ? 'Unlimited' : exam.attemptsAllowed}
                              </span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                              {exam.status === 'draft' ? (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEditExam(exam.id)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    onClick={() => handlePreviewExam(exam.id)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Preview & Publish
                                  </Button>
                                </div>
                              ) : exam.status === 'active' ? (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handlePreviewExam(exam.id)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Preview
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <FileText className="h-4 w-4 mr-1" />
                                    View Results
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handlePreviewExam(exam.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Preview
                                </Button>
                              )}
                              
                              <div className="flex items-center space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditExam(exam.id)}
                                  title="Edit exam settings"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Copy exam">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                
                                {/* Archive/Delete Dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" title="More actions">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {(exam.status === 'active' || exam.status === 'completed') && (
                                      <DropdownMenuItem onClick={() => setArchivingExamId(exam.id)}>
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive Exam
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => setDeletingExamId(exam.id)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Exam
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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
