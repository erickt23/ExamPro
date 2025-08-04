import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { BookOpen, Plus, Search, Clock, Users, Eye, Edit, CheckCircle } from "lucide-react";

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

  // Create homework mutation
  const createHomeworkMutation = useMutation({
    mutationFn: async (homeworkData: any) => {
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
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      setShowCreateModal(false);
      setNewHomework({ title: "", description: "", subjectId: "", dueDate: "" });
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
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      setShowEditModal(false);
      setSelectedHomework(null);
      setNewHomework({ title: "", description: "", subjectId: "", dueDate: "" });
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

    createHomeworkMutation.mutate({
      title: newHomework.title,
      description: newHomework.description,
      subjectId: parseInt(newHomework.subjectId),
      dueDate: newHomework.dueDate || null,
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

    updateHomeworkMutation.mutate({
      id: selectedHomework.id,
      homeworkData: {
        title: newHomework.title,
        description: newHomework.description,
        subjectId: parseInt(newHomework.subjectId),
        dueDate: newHomework.dueDate || null,
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
      dueDate: homework.dueDate ? new Date(homework.dueDate).toISOString().slice(0, 16) : "",
    });
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Homework Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Homework Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditHomework}
                  disabled={updateHomeworkMutation.isPending}
                >
                  {updateHomeworkMutation.isPending ? "Updating..." : "Update Homework"}
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
        <div className="grid gap-4">
          {filteredHomework.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No homework assignments found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first homework assignment to get started"
                  }
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Homework
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredHomework.map((hw) => (
              <Card key={hw.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{hw.title}</CardTitle>
                      <p className="text-gray-600 mt-1 line-clamp-2">{hw.description}</p>
                    </div>
                    {getStatusBadge(hw.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {hw.dueDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Due: {new Date(hw.dueDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {subjects.find((s: any) => s.id === hw.subjectId)?.name || 'Unknown Subject'}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(hw)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditClick(hw)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {hw.status === 'draft' && (
                      <Button 
                        size="sm"
                        onClick={() => handlePublish(hw.id)}
                        disabled={publishHomeworkMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {publishHomeworkMutation.isPending ? 'Publishing...' : 'Publish'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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