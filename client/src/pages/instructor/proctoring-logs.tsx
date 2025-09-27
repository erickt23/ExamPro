import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  Filter,
  Search,
  Shield,
  ShieldAlert,
  User,
  FileText,
  BarChart3,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";

// Types
interface ProctoringViolation {
  type: string;
  timestamp: string;
  description: string;
}

interface ProctoringData {
  violations: ProctoringViolation[];
  totalViolations: number;
  isTerminatedForViolations: boolean;
}

interface SubmissionWithProctoring {
  id: number;
  examId: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examTitle: string;
  startedAt: string;
  submittedAt: string | null;
  timeTaken: number | null;
  totalScore: number | null;
  maxScore: number | null;
  status: string;
  proctoringData: ProctoringData | null;
}

// Violation type mappings for better display
const VIOLATION_TYPE_LABELS: Record<string, string> = {
  tab_switch: "Tab Switch",
  window_blur: "Window Focus Lost",
  fullscreen_exit: "Fullscreen Exit",
  context_menu: "Context Menu",
  dev_tools: "Developer Tools",
  copy_attempt: "Copy Attempt",
  paste_attempt: "Paste Attempt",
  keyboard_shortcut: "Prohibited Shortcut",
};

const VIOLATION_TYPE_COLORS: Record<string, string> = {
  tab_switch: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  window_blur: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  fullscreen_exit: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  context_menu: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  dev_tools: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  copy_attempt: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  paste_attempt: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  keyboard_shortcut: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
};

export default function ProctoringLogs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterViolations, setFilterViolations] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithProctoring | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  // Fetch submissions with proctoring data
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: ["/api/proctoring-logs"],
    staleTime: 30000, // Cache for 30 seconds
    enabled: isAuthenticated, // Only fetch when authenticated
  }) as { data: SubmissionWithProctoring[], isLoading: boolean, error: any };

  // Process and filter data
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions.filter((submission: SubmissionWithProctoring) => {
      // Only show submissions with proctoring data
      if (!submission.proctoringData) return false;

      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        submission.studentName?.toLowerCase().includes(searchLower) ||
        submission.studentEmail?.toLowerCase().includes(searchLower) ||
        submission.examTitle?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "terminated" && submission.proctoringData.isTerminatedForViolations) ||
        (filterStatus === "completed" && !submission.proctoringData.isTerminatedForViolations && submission.status === "submitted") ||
        (filterStatus === "in_progress" && submission.status === "in_progress");

      // Violations filter
      const violationCount = submission.proctoringData.totalViolations || 0;
      const matchesViolations = filterViolations === "all" ||
        (filterViolations === "none" && violationCount === 0) ||
        (filterViolations === "low" && violationCount >= 1 && violationCount <= 2) ||
        (filterViolations === "medium" && violationCount >= 3 && violationCount <= 5) ||
        (filterViolations === "high" && violationCount > 5);

      return matchesSearch && matchesStatus && matchesViolations;
    });

    return filtered.sort((a: SubmissionWithProctoring, b: SubmissionWithProctoring) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [submissions, searchTerm, filterStatus, filterViolations]);

  // Pagination calculations
  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterViolations]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalSubmissions = submissions.filter((s: SubmissionWithProctoring) => s.proctoringData).length;
    const terminatedSubmissions = submissions.filter((s: SubmissionWithProctoring) => 
      s.proctoringData?.isTerminatedForViolations
    ).length;
    const submissionsWithViolations = submissions.filter((s: SubmissionWithProctoring) => 
      s.proctoringData && s.proctoringData.totalViolations > 0
    ).length;
    const totalViolations = submissions.reduce((acc: number, s: SubmissionWithProctoring) => 
      acc + (s.proctoringData?.totalViolations || 0), 0
    );

    const violationTypes: Record<string, number> = {};
    submissions.forEach((s: SubmissionWithProctoring) => {
      if (s.proctoringData?.violations) {
        s.proctoringData.violations.forEach(v => {
          violationTypes[v.type] = (violationTypes[v.type] || 0) + 1;
        });
      }
    });

    return {
      totalSubmissions,
      terminatedSubmissions,
      submissionsWithViolations,
      totalViolations,
      violationTypes,
      cleanSubmissions: totalSubmissions - submissionsWithViolations,
      terminationRate: totalSubmissions > 0 ? Math.round((terminatedSubmissions / totalSubmissions) * 100) : 0,
    };
  }, [submissions]);

  const toggleRowExpansion = (submissionId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedRows(newExpanded);
  };

  const getViolationSeverity = (count: number) => {
    if (count === 0) return { label: "Clean", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" };
    if (count <= 2) return { label: "Low", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" };
    if (count <= 5) return { label: "Medium", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400" };
    return { label: "High", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" };
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-y-auto ml-0 transition-all duration-300">
            <div className="p-3 md:p-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Error Loading Proctoring Logs</h3>
                    <p className="text-muted-foreground">Unable to load proctoring data. Please try again later.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
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
          <div className="p-3 md:p-6">
            <div className="space-y-6" data-testid="proctoring-logs-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8 text-indigo-600" />
            Proctoring Logs
          </h1>
          <p className="mt-2 text-gray-600 dark:text-muted-foreground">
            Monitor exam security and review proctoring violations across all exams
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Monitored</p>
                <p className="text-2xl font-bold" data-testid="stat-total-monitored">
                  {statistics.totalSubmissions}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Clean Sessions</p>
                <p className="text-2xl font-bold text-green-600" data-testid="stat-clean-sessions">
                  {statistics.cleanSubmissions}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Violations</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="stat-total-violations">
                  {statistics.totalViolations}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Terminated</p>
                <p className="text-2xl font-bold text-red-600" data-testid="stat-terminated">
                  {statistics.terminatedSubmissions}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statistics.terminationRate}% rate
                </p>
              </div>
              <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, email, or exam title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48" data-testid="filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterViolations} onValueChange={setFilterViolations}>
                <SelectTrigger className="w-48" data-testid="filter-violations">
                  <SelectValue placeholder="Filter by violations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Violations</SelectItem>
                  <SelectItem value="none">No Violations</SelectItem>
                  <SelectItem value="low">Low (1-2)</SelectItem>
                  <SelectItem value="medium">Medium (3-5)</SelectItem>
                  <SelectItem value="high">High (6+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Proctoring Sessions ({totalItems} total
              {totalPages > 1 && `, page ${currentPage} of ${totalPages}`})
            </span>
            {totalItems > 0 && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading proctoring logs...</p>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Proctoring Data Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== "all" || filterViolations !== "all" 
                  ? "No sessions match your current filters."
                  : "No exams with proctoring enabled have been submitted yet."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubmissions.map((submission: SubmissionWithProctoring) => {
                    const isExpanded = expandedRows.has(submission.id);
                    const violationCount = submission.proctoringData?.totalViolations || 0;
                    const severity = getViolationSeverity(violationCount);

                    return (
                      <>
                        <TableRow key={submission.id} data-testid={`submission-row-${submission.id}`}>
                          <TableCell>
                            {violationCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => toggleRowExpansion(submission.id)}
                                data-testid={`expand-button-${submission.id}`}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium" data-testid={`student-name-${submission.id}`}>
                                {submission.studentName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {submission.studentEmail}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium" data-testid={`exam-title-${submission.id}`}>
                              {submission.examTitle}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(submission.startedAt), "MMM d, yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(submission.startedAt), "HH:mm")}
                            </div>
                          </TableCell>
                          <TableCell>
                            {submission.timeTaken ? (
                              <span data-testid={`time-taken-${submission.id}`}>
                                {Math.floor(submission.timeTaken / 60)}h {submission.timeTaken % 60}m
                              </span>
                            ) : (
                              <span className="text-muted-foreground">In progress</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={severity.color}
                              data-testid={`violations-badge-${submission.id}`}
                            >
                              {violationCount === 0 ? severity.label : `${violationCount} ${severity.label}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {submission.proctoringData?.isTerminatedForViolations ? (
                                <Badge variant="destructive" data-testid={`status-${submission.id}`}>
                                  Terminated
                                </Badge>
                              ) : (
                                <Badge 
                                  variant={submission.status === "submitted" ? "default" : "secondary"}
                                  data-testid={`status-${submission.id}`}
                                >
                                  {submission.status === "submitted" ? "Completed" : "In Progress"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                              data-testid={`view-details-${submission.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded row showing violations */}
                        {isExpanded && violationCount > 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30">
                              <div className="p-4 space-y-3" data-testid={`violations-expanded-${submission.id}`}>
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  Violation Details ({violationCount} total)
                                </h4>
                                <div className="grid gap-2">
                                  {submission.proctoringData?.violations?.map((violation, index) => (
                                    <div 
                                      key={index}
                                      className="flex items-center justify-between p-2 bg-background rounded border"
                                      data-testid={`violation-detail-${submission.id}-${index}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Badge 
                                          className={cn("text-xs", VIOLATION_TYPE_COLORS[violation.type] || "bg-gray-100 text-gray-800")}
                                        >
                                          {VIOLATION_TYPE_LABELS[violation.type] || violation.type}
                                        </Badge>
                                        <span className="text-sm">{violation.description}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(violation.timestamp), "HH:mm:ss")}
                                      </div>
                                    </div>
                                  )) || []}
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="pagination-previous"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNumber)}
                        data-testid={`pagination-page-${pageNumber}`}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  data-testid="pagination-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Detailed View Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Proctoring Session Details
            </DialogTitle>
            <DialogDescription>
              Detailed proctoring information for {selectedSubmission?.studentName}'s exam session
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-6" data-testid="detailed-view-dialog">
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <p className="font-medium">{selectedSubmission.studentName}</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.studentEmail}</p>
                </div>
                <div className="space-y-2">
                  <Label>Exam</Label>
                  <p className="font-medium">{selectedSubmission.examTitle}</p>
                </div>
                <div className="space-y-2">
                  <Label>Started At</Label>
                  <p>{format(new Date(selectedSubmission.startedAt), "MMM d, yyyy 'at' HH:mm")}</p>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <p>
                    {selectedSubmission.timeTaken 
                      ? `${Math.floor(selectedSubmission.timeTaken / 60)}h ${selectedSubmission.timeTaken % 60}m`
                      : "In progress"
                    }
                  </p>
                </div>
              </div>

              {/* Proctoring Summary */}
              {selectedSubmission.proctoringData && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Proctoring Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {selectedSubmission.proctoringData.totalViolations}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Violations</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {selectedSubmission.proctoringData.violations?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Unique Events</p>
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        "text-2xl font-bold",
                        selectedSubmission.proctoringData.isTerminatedForViolations ? "text-red-600" : "text-green-600"
                      )}>
                        {selectedSubmission.proctoringData.isTerminatedForViolations ? "Yes" : "No"}
                      </p>
                      <p className="text-sm text-muted-foreground">Terminated</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Violation Timeline */}
              {selectedSubmission.proctoringData?.violations && selectedSubmission.proctoringData.violations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Violation Timeline</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedSubmission.proctoringData.violations
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((violation, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`timeline-violation-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={cn("text-xs", VIOLATION_TYPE_COLORS[violation.type] || "bg-gray-100 text-gray-800")}>
                              {VIOLATION_TYPE_LABELS[violation.type] || violation.type}
                            </Badge>
                            <span className="text-sm">{violation.description}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(violation.timestamp), "HH:mm:ss")}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper component for labels in the detailed view
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-muted-foreground">{children}</div>;
}