import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ChevronRight
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
  const [globalSettings, setGlobalSettings] = useState({
    assignmentCoefficient: 0.4,
    examCoefficient: 0.6
  });
  const [courseSettings, setCourseSettings] = useState<Record<number, {
    assignmentCoefficient: number;
    examCoefficient: number;
  }>>({});

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
    if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
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
              <div className="text-lg">Loading settings...</div>
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
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600 text-sm md:text-base">Configure grade calculation coefficients and system preferences</p>
            </div>

            <Tabs defaultValue="subjects" className="w-full">
              <TabsList>
                <TabsTrigger value="subjects" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subject Management
                </TabsTrigger>
                <TabsTrigger value="global" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Global Settings
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Course-Specific Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="subjects">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Subject Management
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Create and manage subjects for your courses, exams, and homework assignments.
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowCreateSubjectModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      >
                        <Plus className="h-4 w-4" />
                        Add Subject
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!subjects || !Array.isArray(subjects) || subjects.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">No subjects created yet</h3>
                        <p className="text-sm mb-4">Create your first subject to start organizing your courses</p>
                        <Button
                          onClick={() => setShowCreateSubjectModal(true)}
                          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          <Plus className="h-4 w-4" />
                          Create First Subject
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
                                <TableHead>Subject Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
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
                                      {subject.description || <span className="italic text-gray-400">No description</span>}
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
                              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} subjects
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="global">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Global Grade Calculation Settings
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      These are the default coefficients used for all courses unless overridden by course-specific settings.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Final Grade = (Assignment Coefficient × Assignment Score) + (Exam Coefficient × Exam Score)
                        <br />
                        Coefficients must sum to 1.0 (100%).
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="global-assignment">Assignment Coefficient</Label>
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
                          Weight for assignments ({(globalSettings.assignmentCoefficient * 100).toFixed(0)}%)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="global-exam">Exam Coefficient</Label>
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
                          Weight for exams ({(globalSettings.examCoefficient * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        Sum: {(globalSettings.assignmentCoefficient + globalSettings.examCoefficient).toFixed(2)}
                        {(globalSettings.assignmentCoefficient + globalSettings.examCoefficient) !== 1 && (
                          <span className="text-red-500 ml-2">Must equal 1.0</span>
                        )}
                      </div>
                      <Button 
                        onClick={handleSaveGlobalSettings}
                        disabled={saveGlobalSettingsMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saveGlobalSettingsMutation.isPending ? "Saving..." : "Save Global Settings"}
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
                      Course-Specific Grade Settings
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Override global settings for specific courses. Courses without custom settings will use global defaults.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {!subjects || !Array.isArray(subjects) || subjects.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No courses available</p>
                        <p className="text-sm mt-2">Create some courses to configure course-specific settings</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Assignment Coefficient</TableHead>
                            <TableHead>Exam Coefficient</TableHead>
                            <TableHead>Actions</TableHead>
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
                                    Save
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
            </Tabs>
          </div>
        </main>
      </div>

      {/* Create Subject Modal */}
      <Dialog open={showCreateSubjectModal} onOpenChange={setShowCreateSubjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
          </DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(handleCreateSubject)} className="space-y-4">
              <FormField
                control={subjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subject name" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter subject description"
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSubjectMutation.isPending}
                >
                  {createSubjectMutation.isPending ? "Creating..." : "Create Subject"}
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
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(handleUpdateSubject)} className="space-y-4">
              <FormField
                control={subjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subject name" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter subject description"
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSubjectMutation.isPending}
                >
                  {updateSubjectMutation.isPending ? "Updating..." : "Update Subject"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}