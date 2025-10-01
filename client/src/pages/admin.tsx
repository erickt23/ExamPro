import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, HelpCircle, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import CreateAdminQuestionModal from "@/components/modals/create-admin-question-modal";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";

export default function AdminPage() {
  const { t } = useTranslation();
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
      if (!response.ok) throw new Error(t('admin.fetchQuestionsError'));
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
        title: t('common.success'),
        description: t('admin.roleUpdateSuccess'),
      });
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast({
        title: t('common.error'),
        description: t('admin.roleUpdateError'),
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
        title: t('common.success'),
        description: t('admin.questionDeleteSuccess'),
      });
    },
    onError: (error) => {
      console.error("Error deleting question:", error);
      toast({
        title: t('common.error'),
        description: t('admin.questionDeleteError'),
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (confirm(t('admin.deleteConfirmation'))) {
      deleteQuestionMutation.mutate(questionId);
    }
  };

  const getVisibilityBadge = (question: any) => {
    if (question.visibilityType === 'all_instructors') {
      return <Badge variant="default" className="bg-green-100 text-green-800"><Eye className="w-3 h-3 mr-1" />{t('admin.allInstructors')}</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><EyeOff className="w-3 h-3 mr-1" />{t('admin.specificOnly')}</Badge>;
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto ml-0 transition-all duration-300">
          <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.panelTitle')}</h1>
              </div>
              <p className="text-gray-600">
                {t('admin.panelDescription')}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('admin.userManagement')}
                </TabsTrigger>
                <TabsTrigger value="questions" className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  {t('admin.questionManagement')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-6">

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {t('admin.allUsers')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.userManagementDescription')}
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
                                    : user.email || t('admin.user', [user.id])}
                                </p>
                                <Badge 
                                  variant={
                                    user.role === "instructor" ? "default" : 
                                    user.role === "admin" ? "default" : "secondary"
                                  }
                                  className={
                                    user.role === "instructor" ? "bg-blue-100 text-blue-800" :
                                    user.role === "admin" ? "bg-purple-100 text-purple-800" : ""
                                  }
                                >
                                  {user.role === "instructor" ? t('admin.instructorRole') : 
                                   user.role === "admin" ? t('admin.adminRole') : 
                                   user.role}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <p className="text-xs text-gray-400">{t('admin.userId', [user.id])}</p>
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
                                <SelectItem value="student">{t('admin.studentRole')}</SelectItem>
                                <SelectItem value="instructor">{t('admin.instructorRole')}</SelectItem>
                                <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                      
                      {users.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>{t('admin.noUsersFound')}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{t('admin.testingInstructions')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">{t('admin.howToTest')}</h3>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                        <li>{t('admin.loginInstruction')}</li>
                        <li>{t('admin.changeRoleInstruction')}</li>
                        <li>{t('admin.navigateInstruction')}</li>
                        <li>{t('admin.testInstructorFeatures')}</li>
                        <li>{t('admin.testStudentFeatures')}</li>
                      </ol>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-medium text-green-900 mb-2">{t('admin.roleDifferences')}</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-green-800 mb-1">{t('admin.instructorRoleLabel')}</h4>
                          <ul className="list-disc list-inside text-green-700 space-y-1">
                            <li>{t('admin.questionBankManagement')}</li>
                            <li>{t('admin.examCreation')}</li>
                            <li>{t('admin.gradingInterface')}</li>
                            <li>{t('admin.analyticsReports')}</li>
                            <li>{t('admin.studentManagement')}</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-green-800 mb-1">{t('admin.studentRoleLabel')}</h4>
                          <ul className="list-disc list-inside text-green-700 space-y-1">
                            <li>{t('admin.viewExams')}</li>
                            <li>{t('admin.takeExams')}</li>
                            <li>{t('admin.viewGrades')}</li>
                            <li>{t('admin.assignmentTracking')}</li>
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
                      {t('admin.adminQuestions')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.adminQuestionsDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                          <Input
                            placeholder={t('admin.searchQuestions')}
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
                              <SelectItem value="all">{t('admin.allCategories')}</SelectItem>
                              <SelectItem value="exam">{t('admin.examQuestions')}</SelectItem>
                              <SelectItem value="homework">{t('admin.homeworkQuestions')}</SelectItem>
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
                              <SelectItem value="all">{t('admin.allVisibility')}</SelectItem>
                              <SelectItem value="all_instructors">{t('admin.allInstructors')}</SelectItem>
                              <SelectItem value="specific_instructors">{t('admin.specificOnly')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={() => setShowCreateQuestionModal(true)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          data-testid="button-create-admin-question"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t('admin.createQuestion')}
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
                                      {question.title || t('admin.questionId', [question.id])}
                                    </h3>
                                    <Badge variant="outline">{question.category}</Badge>
                                    {getVisibilityBadge(question)}
                                    <Badge variant="secondary">{question.questionType}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                    {question.questionText}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{t('admin.difficultyLabel', [question.difficulty])}</span>
                                    <span>{t('admin.pointsLabel', [question.points])}</span>
                                    <span>{t('admin.usageLabel', [question.usageCount])}</span>
                                    {question.visibilityType === 'specific_instructors' && question.authorizedInstructorIds && (
                                      <span>{t('admin.authorizedLabel', [question.authorizedInstructorIds.length])}</span>
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
                              <p>{t('admin.noAdminQuestions')}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
            </Tabs>

            <CreateAdminQuestionModal
              open={showCreateQuestionModal}
              onOpenChange={setShowCreateQuestionModal}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
