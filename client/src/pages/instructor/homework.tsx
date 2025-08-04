import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { BookOpen, Plus, Search, Clock, Users } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHomework, setNewHomework] = useState({
    title: "",
    description: "",
    subjectId: "",
    dueDate: "",
  });

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

  return (
    <div className="container mx-auto p-6 space-y-6">
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
                        Due: {new Date(hw.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Subject ID: {hw.subjectId}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    {hw.status === 'draft' && (
                      <Button size="sm">
                        Publish
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
  );
}