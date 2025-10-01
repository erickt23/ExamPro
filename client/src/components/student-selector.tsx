import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Users, X, UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface StudentSelectorProps {
  assignmentId: number | null;
  assignmentType: 'exam' | 'homework';
  onAssignmentsChange?: () => void;
}

export default function StudentSelector({ assignmentId, assignmentType, onAssignmentsChange }: StudentSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Fetch all students
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Filter only students
  const allStudents = allUsers.filter((user) => user.role === 'student');

  // Fetch assigned students
  const { data: assignedStudents = [], refetch: refetchAssigned } = useQuery<User[]>({
    queryKey: [`/api/${assignmentType}s`, assignmentId, 'assigned-students'],
    queryFn: async () => {
      if (!assignmentId) return [];
      const response = await fetch(`/api/${assignmentType}s/${assignmentId}/assigned-students`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!assignmentId,
    retry: false,
  });

  // Initialize selected students when assigned students are loaded
  useEffect(() => {
    if (assignedStudents && assignedStudents.length > 0) {
      setSelectedStudents(assignedStudents.map((s) => s.id));
    }
  }, [assignedStudents]);

  // Assign students mutation
  const assignMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      if (!assignmentId) throw new Error("No assignment ID");
      return apiRequest(`/api/${assignmentType}s/${assignmentId}/assign-students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds }),
      });
    },
    onSuccess: () => {
      refetchAssigned();
      onAssignmentsChange?.();
      toast({
        title: t.common.success,
        description: "Students assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || "Failed to assign students",
        variant: "destructive",
      });
    },
  });

  // Remove students mutation
  const removeMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      if (!assignmentId) throw new Error("No assignment ID");
      return apiRequest(`/api/${assignmentType}s/${assignmentId}/assigned-students`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds }),
      });
    },
    onSuccess: () => {
      refetchAssigned();
      onAssignmentsChange?.();
      toast({
        title: t.common.success,
        description: "Students removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || "Failed to remove students",
        variant: "destructive",
      });
    },
  });

  // Filter students by search term
  const filteredStudents = allStudents.filter((student) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const email = (student.email || '').toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  // Get assigned student IDs
  const assignedStudentIds = new Set(assignedStudents.map((s) => s.id));

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all filtered students
  const selectAll = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    setSelectedStudents((prev) => {
      const newSet = new Set([...prev, ...filteredIds]);
      return Array.from(newSet);
    });
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedStudents([]);
  };

  // Apply changes (add newly selected, remove newly deselected)
  const applyChanges = async () => {
    const currentlyAssigned = new Set(assignedStudents.map((s) => s.id));
    const newSelection = new Set(selectedStudents);

    // Students to add (in new selection but not currently assigned)
    const toAdd = Array.from(newSelection).filter((id) => !currentlyAssigned.has(id));

    // Students to remove (currently assigned but not in new selection)
    const toRemove = Array.from(currentlyAssigned).filter((id) => !newSelection.has(id));

    try {
      if (toAdd.length > 0) {
        await assignMutation.mutateAsync(toAdd);
      }
      if (toRemove.length > 0) {
        await removeMutation.mutateAsync(toRemove);
      }
    } catch (error) {
      console.error("Error applying changes:", error);
    }
  };

  const hasChanges = () => {
    const currentlyAssigned = new Set(assignedStudents.map((s) => s.id));
    const newSelection = new Set(selectedStudents);

    if (currentlyAssigned.size !== newSelection.size) return true;

    for (const id of currentlyAssigned) {
      if (!newSelection.has(id)) return true;
    }

    return false;
  };

  const getDisplayName = (student: User) => {
    if (student.firstName || student.lastName) {
      return `${student.firstName || ''} ${student.lastName || ''}`.trim();
    }
    return student.email || student.id;
  };

  if (!assignmentId) {
    return (
      <Card className="bg-card dark:bg-card border-border dark:border-border">
        <CardHeader>
          <CardTitle className="text-foreground dark:text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.instructor?.assignStudents || "Assign Students"}
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-muted-foreground">
            {t.instructor?.saveFirstToAssign || "Save the assignment first to assign students"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card dark:bg-card border-border dark:border-border">
      <CardHeader>
        <CardTitle className="text-foreground dark:text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t.instructor?.assignStudents || "Assign Students"}
        </CardTitle>
        <CardDescription className="text-muted-foreground dark:text-muted-foreground">
          {t.instructor?.selectStudentsDescription || "Select which students can access this assignment"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
          <Input
            placeholder={t.instructor?.searchStudents || "Search students..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background dark:bg-background text-foreground dark:text-foreground border-input dark:border-input"
            data-testid="input-student-search"
          />
        </div>

        {/* Currently Assigned */}
        {assignedStudents.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground dark:text-foreground">
              {t.instructor.currentlyAssigned || "Currently Assigned"} ({assignedStudents.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {assignedStudents.map((student) => (
                <Badge
                  key={student.id}
                  variant="secondary"
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  data-testid={`badge-assigned-${student.id}`}
                >
                  {getDisplayName(student)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="bg-background dark:bg-background text-foreground dark:text-foreground border-input dark:border-input hover:bg-accent dark:hover:bg-accent"
            data-testid="button-select-all"
          >
            {t.common.selectAll || "Select All"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={deselectAll}
            className="bg-background dark:bg-background text-foreground dark:text-foreground border-input dark:border-input hover:bg-accent dark:hover:bg-accent"
            data-testid="button-deselect-all"
          >
            {t.common.deselectAll || "Deselect All"}
          </Button>
        </div>

        {/* Student List */}
        <ScrollArea className="h-[300px] border rounded-md border-border dark:border-border bg-background dark:bg-background">
          <div className="p-4 space-y-2">
            {filteredStudents.length === 0 ? (
              <div className="text-center text-muted-foreground dark:text-muted-foreground py-8">
                {searchTerm
                  ? t.common.noStudentsFound || "No students found"
                  : t.common.noStudentsAvailable || "No students available"}
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-accent dark:hover:bg-accent transition-colors"
                  data-testid={`student-item-${student.id}`}
                >
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                    data-testid={`checkbox-student-${student.id}`}
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-foreground dark:text-foreground">
                      {getDisplayName(student)}
                    </div>
                    {student.email && (
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                        {student.email}
                      </div>
                    )}
                  </div>
                  {assignedStudentIds.has(student.id) && (
                    <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                      {t.instructor.assigned || "Assigned"}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Selection Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground dark:text-muted-foreground">
            {selectedStudents.length} {t.common.selected || "selected"}
          </span>
          {hasChanges() && (
            <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
              {t.common.unsavedChanges || "Unsaved changes"}
            </Badge>
          )}
        </div>

        {/* Apply Button */}
        <Button
          type="button"
          onClick={applyChanges}
          disabled={!hasChanges() || assignMutation.isPending || removeMutation.isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          data-testid="button-apply-assignments"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {assignMutation.isPending || removeMutation.isPending
            ? t.common.applying || "Applying..."
            : t.common.applyChanges || "Apply Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}