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
  Globe
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600">Configure grade calculation coefficients and system preferences</p>
            </div>

            <Tabs defaultValue="global" className="w-full">
              <TabsList>
                <TabsTrigger value="global" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Global Settings
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course-Specific Settings
                </TabsTrigger>
              </TabsList>

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
    </div>
  );
}