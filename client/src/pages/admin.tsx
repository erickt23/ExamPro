import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, HelpCircle, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
// import CreateAdminQuestionModal from "@/components/modals/create-admin-question-modal";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState(false);
  const [questionFilters, setQuestionFilters] = useState({
    search: '',
    category: 'all',
    visibilityType: 'all',
  });

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: adminQuestions = { questions: [], total: 0, page: 1, totalPages: 0 }, isLoading: questionsLoading } = useQuery({
    queryKey: ["/api/admin/questions", questionFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (questionFilters.search) params.append('search', questionFilters.search);
      if (questionFilters.category !== 'all') params.append('category', questionFilters.category);
      if (questionFilters.visibilityType !== 'all') params.append('visibilityType', questionFilters.visibilityType);
      
      const response = await fetch(`/api/admin/questions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch admin questions');
      return response.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await apiRequest("DELETE", `/api/admin/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting question:", error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteQuestionMutation.mutate(questionId);
    }
  };

  const getVisibilityBadge = (question: any) => {
    if (question.visibilityType === 'all_instructors') {
      return <Badge variant="default" className="bg-green-100 text-green-800"><Eye className="w-3 h-3 mr-1" />All Instructors</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><EyeOff className="w-3 h-3 mr-1" />Specific Only</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-gray-600">
          Manage user roles and create questions with visibility controls
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Question Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Manage user roles to test different access levels in the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user: any) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.firstName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email || `User ${user.id}`}
                      </p>
                      <Badge 
                        variant={user.role === "instructor" ? "default" : "secondary"}
                        className={user.role === "instructor" ? "bg-blue-100 text-blue-800" : ""}
                      >
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">ID: {user.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={user.role}
                    onValueChange={(role) => handleRoleChange(user.id, role)}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No users found. Users will appear here after they log in.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">How to Test Different Roles:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Log in with your Replit account (you'll appear in the user list above)</li>
              <li>Use this page to change your role to "instructor" or "student"</li>
              <li>Navigate back to the home page to see the role-specific interface</li>
              <li>Test instructor features: create questions, exams, and view analytics</li>
              <li>Test student features: take exams and view grades</li>
            </ol>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Role Differences:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-800 mb-1">Instructor Role:</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1">
                  <li>Question bank management</li>
                  <li>Exam creation and settings</li>
                  <li>Grading interface</li>
                  <li>Analytics and reports</li>
                  <li>Student management</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-1">Student Role:</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1">
                  <li>View available exams</li>
                  <li>Take exams with timer</li>
                  <li>View grades and feedback</li>
                  <li>Assignment tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      </TabsContent>

      <TabsContent value="questions" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Admin Questions
            </CardTitle>
            <CardDescription>
              Create and manage questions with visibility controls for instructors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <Input
                    placeholder="Search questions..."
                    value={questionFilters.search}
                    onChange={(e) => setQuestionFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-64"
                    data-testid="input-search-questions"
                  />
                  <Select
                    value={questionFilters.category}
                    onValueChange={(value) => setQuestionFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="exam">Exam Questions</SelectItem>
                      <SelectItem value="homework">Homework Questions</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={questionFilters.visibilityType}
                    onValueChange={(value) => setQuestionFilters(prev => ({ ...prev, visibilityType: value }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Visibility</SelectItem>
                      <SelectItem value="all_instructors">All Instructors</SelectItem>
                      <SelectItem value="specific_instructors">Specific Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => setShowCreateQuestionModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  data-testid="button-create-admin-question"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Question
                </Button>
              </div>

              {questionsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {adminQuestions.questions.map((question: any) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {question.title || `Question ${question.id}`}
                            </h3>
                            <Badge variant="outline">{question.category}</Badge>
                            {getVisibilityBadge(question)}
                            <Badge variant="secondary">{question.questionType}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {question.questionText}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Difficulty: {question.difficulty}</span>
                            <span>Points: {question.points}</span>
                            <span>Usage: {question.usageCount} times</span>
                            {question.visibilityType === 'specific_instructors' && question.authorizedInstructorIds && (
                              <span>Authorized: {question.authorizedInstructorIds.length} instructor(s)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                            disabled={deleteQuestionMutation.isPending}
                            data-testid={`button-delete-question-${question.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {adminQuestions.questions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No admin questions found. Create your first question to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      </Tabs>
    </div>
  );
}