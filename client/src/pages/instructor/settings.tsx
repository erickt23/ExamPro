import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Settings2, 
  Save, 
  BookOpen, 
  Calculator,
  AlertCircle,
  Users,
  Globe,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  Monitor
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Subject form schema
const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
});

type SubjectForm = z.infer<typeof subjectSchema>;

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [globalSettings, setGlobalSettings] = useState({
    assignmentCoefficient: 0.4,
    examCoefficient: 0.6
  });
  const [courseSettings, setCourseSettings] = useState<Record<number, {
    assignmentCoefficient: number;
    examCoefficient: number;
  }>>({});
  const [proctoringSettings, setProctoringSettings] = useState({
    enableProctoringByDefault: false,
    defaultWarningThreshold: 3,
    defaultAutoTerminate: false,
    enableFullscreenMode: true,
    enableTabDetection: true,
    enableContextMenuBlock: true,
    enableDevToolsDetection: true,
    enableCopyPasteBlock: true,
    allowInstructorOverride: true
  });

  // Subject management state
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  
  // Pagination state for subjects table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const subjectForm = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!authLoading && !user) {
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
  }, [user, authLoading, toast]);

  // Fetch subjects/courses for course-specific settings
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!user,
    retry: false,
  });

  // Fetch current grade settings
  const { data: currentSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/grade-settings"],
    queryFn: async () => {
      const response = await fetch("/api/grade-settings");
      if (!response.ok) {
        if (response.status === 404) {
          // No settings exist yet, use defaults
          return {
            global: { assignmentCoefficient: 0.4, examCoefficient: 0.6 },
            courses: {}
          };
        }
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Fetch proctoring settings
  const { data: currentProctoringSettings, isLoading: proctoringSettingsLoading } = useQuery({
    queryKey: ["/api/proctoring-settings"],
    queryFn: async () => {
      const response = await fetch("/api/proctoring-settings");
      if (!response.ok) {
        if (response.status === 404) {
          // No settings exist yet, use defaults
          return null;
        }
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Initialize settings when data loads
  useEffect(() => {
    if (currentSettings) {
      // Convert string coefficients to numbers
      const global = currentSettings.global || { assignmentCoefficient: '0.4000', examCoefficient: '0.6000' };
      setGlobalSettings({
        assignmentCoefficient: parseFloat(global.assignmentCoefficient),
        examCoefficient: parseFloat(global.examCoefficient)
      });
      
      // Convert course settings
      const courses = currentSettings.courses || {};
      const convertedCourses: Record<number, { assignmentCoefficient: number; examCoefficient: number }> = {};
      for (const [courseId, settings] of Object.entries(courses)) {
        convertedCourses[parseInt(courseId)] = {
          assignmentCoefficient: parseFloat((settings as any).assignmentCoefficient),
          examCoefficient: parseFloat((settings as any).examCoefficient)
        };
      }
      setCourseSettings(convertedCourses);
    }
  }, [currentSettings]);

  // Initialize proctoring settings when data loads
  useEffect(() => {
    if (currentProctoringSettings) {
      setProctoringSettings({
        enableProctoringByDefault: currentProctoringSettings.enableProctoringByDefault || false,
        defaultWarningThreshold: currentProctoringSettings.defaultWarningThreshold || 3,
        defaultAutoTerminate: currentProctoringSettings.defaultAutoTerminate || false,
        enableFullscreenMode: currentProctoringSettings.enableFullscreenMode !== false,
        enableTabDetection: currentProctoringSettings.enableTabDetection !== false,
        enableContextMenuBlock: currentProctoringSettings.enableContextMenuBlock !== false,
        enableDevToolsDetection: currentProctoringSettings.enableDevToolsDetection !== false,
        enableCopyPasteBlock: currentProctoringSettings.enableCopyPasteBlock !== false,
        allowInstructorOverride: currentProctoringSettings.allowInstructorOverride !== false
      });
    }
  }, [currentProctoringSettings]);

  // Save global settings mutation
  const saveGlobalSettingsMutation = useMutation({
    mutationFn: async (settings: { assignmentCoefficient: number; examCoefficient: number }) => {
      await apiRequest("POST", "/api/grade-settings/global", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-settings"] });
      toast({
        title: "Settings saved",
        description: "Global grade calculation settings have been updated.",
      });
    },
    onError: (error) => {
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
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save course-specific settings mutation
  const saveCourseSettingsMutation = useMutation({
    mutationFn: async ({ courseId, settings }: { 
      courseId: number; 
      settings: { assignmentCoefficient: number; examCoefficient: number } 
    }) => {
      await apiRequest("POST", `/api/grade-settings/course/${courseId}`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-settings"] });
      toast({
        title: "Course settings saved",
        description: "Course-specific grade calculation settings have been updated.",
      });
    },
    onError: (error) => {
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
        description: "Failed to save course settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save proctoring settings mutation
  const saveProctoringSettingsMutation = useMutation({
    mutationFn: async (settings: typeof proctoringSettings) => {
      await apiRequest("POST", "/api/proctoring-settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proctoring-settings"] });
      toast({
        title: "Proctoring settings saved",
        description: "Global proctoring settings have been updated.",
      });
    },
    onError: (error) => {
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
        description: "Failed to save proctoring settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGlobalSettingsChange = (field: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) return;
    
    setGlobalSettings(prev => ({
      ...prev,
      [field]: numValue,
      // Auto-adjust the other coefficient to maintain sum of 1
      [field === 'assignmentCoefficient' ? 'examCoefficient' : 'assignmentCoefficient']: 1 - numValue
    }));
  };

  const handleCourseSettingsChange = (courseId: number, field: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) return;
    
    setCourseSettings(prev => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        [field]: numValue,
        // Auto-adjust the other coefficient to maintain sum of 1
        [field === 'assignmentCoefficient' ? 'examCoefficient' : 'assignmentCoefficient']: 1 - numValue
      }
    }));
  };

  const handleSaveGlobalSettings = () => {
    if (globalSettings.assignmentCoefficient + globalSettings.examCoefficient !== 1) {
      toast({
        title: "Invalid coefficients",
        description: "Assignment and exam coefficients must sum to 1.0",
        variant: "destructive",
      });
      return;
    }
    saveGlobalSettingsMutation.mutate(globalSettings);
  };

  const handleSaveCourseSettings = (courseId: number) => {
    const settings = courseSettings[courseId];
    if (!settings || settings.assignmentCoefficient + settings.examCoefficient !== 1) {
      toast({
        title: "Invalid coefficients",
        description: "Assignment and exam coefficients must sum to 1.0",
        variant: "destructive",
      });
      return;
    }
    saveCourseSettingsMutation.mutate({ courseId, settings });
  };

  // Proctoring settings handlers
  const handleProctoringSettingsChange = (field: keyof typeof proctoringSettings, value: boolean | number) => {
    setProctoringSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProctoringSettings = () => {
    if (proctoringSettings.defaultWarningThreshold < 1 || proctoringSettings.defaultWarningThreshold > 10) {
      toast({
        title: "Invalid warning threshold",
        description: "Warning threshold must be between 1 and 10",
        variant: "destructive",
      });
      return;
    }
    saveProctoringSettingsMutation.mutate(proctoringSettings);
  };

  // Subject management mutations
  const createSubjectMutation = useMutation({
    mutationFn: async (data: SubjectForm) => {
      await apiRequest("POST", "/api/subjects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: "Success",
        description: "Subject created successfully",
      });
      subjectForm.reset();
      setShowCreateSubjectModal(false);
      setCurrentPage(1); // Reset pagination to first page
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
        description: "Failed to create subject",
        variant: "destructive",
      });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SubjectForm }) => {
      await apiRequest("PUT", `/api/subjects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: "Success",
        description: "Subject updated successfully",
      });
      subjectForm.reset();
      setShowEditSubjectModal(false);
      setEditingSubject(null);
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
        description: "Failed to update subject",
        variant: "destructive",
      });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: "Success",
        description: "Subject deleted successfully",
      });
      // Reset to first page if current page becomes empty
      const remainingItems = (subjects?.length || 0) - 1;
      const newTotalPages = Math.ceil(remainingItems / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (remainingItems === 0) {
        setCurrentPage(1);
      }
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
        description: "Failed to delete subject",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubject = (data: SubjectForm) => {
    createSubjectMutation.mutate(data);
  };

  const handleEditSubject = (subject: any) => {
    setEditingSubject(subject);
    subjectForm.reset({
      name: subject.name,
      description: subject.description || '',
    });
    setShowEditSubjectModal(true);
  };

  const handleUpdateSubject = (data: SubjectForm) => {
    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject.id, data });
    }
  };

  const handleDeleteSubject = (id: number) => {
    if (confirm(`${t('settings.deleteConfirm')} ${t('settings.deleteWarning')}`)) {
      deleteSubjectMutation.mutate(id);
    }
  };

  if (authLoading || settingsLoading || subjectsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">{t('settings.loadingSettings')}</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto ml-0 transition-all duration-300">
          <div className="p-3 md:p-6">
            <div className="mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.systemSettings')}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t('settings.systemSettingsDescription')}</p>
            </div>

            <Tabs defaultValue="subjects" className="w-full">
              <TabsList>
                <TabsTrigger value="subjects" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t('settings.subjects')}
                </TabsTrigger>
                <TabsTrigger value="global" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t('settings.globalSettings')}
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  {t('settings.courseSpecificSettings')}
                </TabsTrigger>
                <TabsTrigger value="proctoring" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  {t('settings.proctoringSettings')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="subjects">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          {t('settings.subjects')}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {t('settings.subjectsCardDescription')}
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowCreateSubjectModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      >
                        <Plus className="h-4 w-4" />
                        {t('settings.addSubject')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!subjects || !Array.isArray(subjects) || subjects.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">{t('settings.noSubjectsYet')}</h3>
                        <p className="text-sm mb-4">{t('settings.createFirstSubjectDescription')}</p>
                        <Button
                          onClick={() => setShowCreateSubjectModal(true)}
                          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          <Plus className="h-4 w-4" />
                          {t('settings.createFirstSubjectButton')}
                        </Button>
                      </div>
                    ) : (() => {
                      // Calculate pagination
                      const subjectsArray = Array.isArray(subjects) ? subjects : [];
                      const totalItems = subjectsArray.length;
                      const totalPages = Math.ceil(totalItems / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedSubjects = subjectsArray.slice(startIndex, endIndex);
                      
                      return (
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('settings.subjectName')}</TableHead>
                                <TableHead>{t('common.description')}</TableHead>
                                <TableHead className="text-right">{t('common.actions')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedSubjects.map((subject: any, index: number) => (
                                <TableRow 
                                  key={subject.id}
                                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                >
                                  <TableCell>
                                    <div className="font-medium">{subject.name}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm text-gray-600 max-w-md">
                                      {subject.description || <span className="italic text-gray-400">{t('settings.noDescription')}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditSubject(subject)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteSubject(subject.id)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          {/* Pagination Controls */}
                          <div className="flex items-center justify-between px-2">
                            <div className="text-sm text-gray-700">
                              {t('settings.showingXtoYofZ', { start: startIndex + 1, end: Math.min(endIndex, totalItems), total: totalItems })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                                {t('common.previous')}
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
                                {t('common.next')}
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="global">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      {t('settings.globalGradeCalculationSettings')}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.globalGradeDescription')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t('settings.finalGradeFormula')}
                        <br />
                        {t('settings.coefficientsNote')}
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="global-assignment">{t('settings.assignmentWeight')}</Label>
                        <Input
                          id="global-assignment"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={globalSettings.assignmentCoefficient}
                          onChange={(e) => handleGlobalSettingsChange('assignmentCoefficient', e.target.value)}
                          placeholder="0.40"
                        />
                        <p className="text-sm text-gray-500">
                          {t('settings.weightForAssignments', { percent: (globalSettings.assignmentCoefficient * 100).toFixed(0) })}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="global-exam">{t('settings.examWeight')}</Label>
                        <Input
                          id="global-exam"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={globalSettings.examCoefficient}
                          onChange={(e) => handleGlobalSettingsChange('examCoefficient', e.target.value)}
                          placeholder="0.60"
                        />
                        <p className="text-sm text-gray-500">
                          {t('settings.weightForExams', { percent: (globalSettings.examCoefficient * 100).toFixed(0) })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        {t('settings.sum', { value: (globalSettings.assignmentCoefficient + globalSettings.examCoefficient).toFixed(2) })}
                        {(globalSettings.assignmentCoefficient + globalSettings.examCoefficient) !== 1 && (
                          <span className="text-red-500 ml-2">{t('settings.mustEqual')}</span>
                        )}
                      </div>
                      <Button 
                        onClick={handleSaveGlobalSettings}
                        disabled={saveGlobalSettingsMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saveGlobalSettingsMutation.isPending ? t('common.loading') : t('settings.saveGlobalSettings')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="courses">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {t('settings.courseSpecificGradeSettings')}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.courseSpecificDescription')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {!subjects || !Array.isArray(subjects) || subjects.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>{t('settings.noCoursesAvailable')}</p>
                        <p className="text-sm mt-2">{t('settings.createCoursesToConfigure')}</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('settings.course')}</TableHead>
                            <TableHead>{t('settings.assignmentWeight')}</TableHead>
                            <TableHead>{t('settings.examWeight')}</TableHead>
                            <TableHead>{t('common.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(subjects) && subjects.map((subject: any) => {
                            const settings = courseSettings[subject.id] || {
                              assignmentCoefficient: globalSettings.assignmentCoefficient,
                              examCoefficient: globalSettings.examCoefficient
                            };
                            
                            return (
                              <TableRow key={subject.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{subject.name}</div>
                                    <div className="text-sm text-gray-500">{subject.description}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="1"
                                      step="0.01"
                                      value={settings.assignmentCoefficient}
                                      onChange={(e) => handleCourseSettingsChange(subject.id, 'assignmentCoefficient', e.target.value)}
                                      className="w-24"
                                    />
                                    <p className="text-xs text-gray-500">
                                      {(settings.assignmentCoefficient * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="1"
                                      step="0.01"
                                      value={settings.examCoefficient}
                                      onChange={(e) => handleCourseSettingsChange(subject.id, 'examCoefficient', e.target.value)}
                                      className="w-24"
                                    />
                                    <p className="text-xs text-gray-500">
                                      {(settings.examCoefficient * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveCourseSettings(subject.id)}
                                    disabled={saveCourseSettingsMutation.isPending}
                                    className="flex items-center gap-1"
                                  >
                                    <Save className="h-3 w-3" />
                                    {t('common.save')}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="proctoring">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5" />
                      {t('settings.proctoringSettings')}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('settings.proctoringDescription')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {proctoringSettingsLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        <Settings2 className="h-8 w-8 mx-auto mb-4 animate-spin text-gray-300" />
                        <p>Loading proctoring settings...</p>
                      </div>
                    ) : (
                      <>
                        {/* Global Proctoring Toggle */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3">
                              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              <div>
                                <Label className="text-base font-medium">Enable Proctoring by Default</Label>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Automatically enable proctoring for all new exams
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={proctoringSettings.enableProctoringByDefault}
                              onCheckedChange={(checked) => handleProctoringSettingsChange('enableProctoringByDefault', checked)}
                              data-testid="switch-enable-proctoring-default"
                            />
                          </div>
                        </div>

                        {/* Warning Threshold */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Default Warning Threshold
                          </Label>
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={proctoringSettings.defaultWarningThreshold}
                              onChange={(e) => handleProctoringSettingsChange('defaultWarningThreshold', parseInt(e.target.value) || 3)}
                              className="w-24"
                              data-testid="input-warning-threshold"
                            />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Number of warnings before action (1-10)
                            </p>
                          </div>
                        </div>

                        {/* Auto-terminate */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <div>
                              <Label>Auto-terminate Exam</Label>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Automatically end exam when warning threshold is reached
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={proctoringSettings.defaultAutoTerminate}
                            onCheckedChange={(checked) => handleProctoringSettingsChange('defaultAutoTerminate', checked)}
                            data-testid="switch-auto-terminate"
                          />
                        </div>

                        {/* Proctoring Features */}
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Proctoring Features
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div>
                                <Label>Fullscreen Mode</Label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Require fullscreen during exam</p>
                              </div>
                              <Switch
                                checked={proctoringSettings.enableFullscreenMode}
                                onCheckedChange={(checked) => handleProctoringSettingsChange('enableFullscreenMode', checked)}
                                data-testid="switch-fullscreen-mode"
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div>
                                <Label>Tab Detection</Label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Detect when students switch tabs</p>
                              </div>
                              <Switch
                                checked={proctoringSettings.enableTabDetection}
                                onCheckedChange={(checked) => handleProctoringSettingsChange('enableTabDetection', checked)}
                                data-testid="switch-tab-detection"
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div>
                                <Label>Context Menu Block</Label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Disable right-click context menu</p>
                              </div>
                              <Switch
                                checked={proctoringSettings.enableContextMenuBlock}
                                onCheckedChange={(checked) => handleProctoringSettingsChange('enableContextMenuBlock', checked)}
                                data-testid="switch-context-menu-block"
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div>
                                <Label>DevTools Detection</Label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Detect when DevTools are opened</p>
                              </div>
                              <Switch
                                checked={proctoringSettings.enableDevToolsDetection}
                                onCheckedChange={(checked) => handleProctoringSettingsChange('enableDevToolsDetection', checked)}
                                data-testid="switch-devtools-detection"
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div>
                                <Label>Copy/Paste Block</Label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Disable copy and paste functions</p>
                              </div>
                              <Switch
                                checked={proctoringSettings.enableCopyPasteBlock}
                                onCheckedChange={(checked) => handleProctoringSettingsChange('enableCopyPasteBlock', checked)}
                                data-testid="switch-copy-paste-block"
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div>
                                <Label>Instructor Override</Label>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Allow instructors to modify settings per exam</p>
                              </div>
                              <Switch
                                checked={proctoringSettings.allowInstructorOverride}
                                onCheckedChange={(checked) => handleProctoringSettingsChange('allowInstructorOverride', checked)}
                                data-testid="switch-instructor-override"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4">
                          <Button
                            onClick={handleSaveProctoringSettings}
                            disabled={saveProctoringSettingsMutation.isPending}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                            data-testid="button-save-proctoring-settings"
                          >
                            <Save className="h-4 w-4" />
                            {saveProctoringSettingsMutation.isPending ? 'Saving...' : 'Save Proctoring Settings'}
                          </Button>
                        </div>

                        {/* Info Alert */}
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            These settings apply to all exams by default. Individual instructors can override these settings for specific exams if "Instructor Override" is enabled.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Create Subject Modal */}
      <Dialog open={showCreateSubjectModal} onOpenChange={setShowCreateSubjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.createNewSubject')}</DialogTitle>
          </DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(handleCreateSubject)} className="space-y-4">
              <FormField
                control={subjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.subjectName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('settings.subjectNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subjectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.descriptionOptional')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('settings.subjectDescriptionPlaceholder')}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateSubjectModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createSubjectMutation.isPending}
                >
                  {createSubjectMutation.isPending ? t('settings.creating') : t('settings.createSubject')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Modal */}
      <Dialog open={showEditSubjectModal} onOpenChange={setShowEditSubjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.editSubject')}</DialogTitle>
          </DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(handleUpdateSubject)} className="space-y-4">
              <FormField
                control={subjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.subjectName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('settings.subjectNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subjectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.descriptionOptional')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('settings.subjectDescriptionPlaceholder')}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditSubjectModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateSubjectMutation.isPending}
                >
                  {updateSubjectMutation.isPending ? t('settings.updating') : t('settings.updateSubject')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}