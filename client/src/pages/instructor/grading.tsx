import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Star,
  MessageSquare
} from "lucide-react";

export default function InstructorGrading() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedExam, setSelectedExam] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submission_date");

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

  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
    retry: false,
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions", selectedExam, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedExam) params.append('examId', selectedExam);
      if (statusFilter !== "all") params.append('status', statusFilter);
      
      const response = await fetch(`/api/submissions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    enabled: !!selectedExam,
  });

  const gradeAnswerMutation = useMutation({
    mutationFn: async ({ answerId, score, feedback }: { answerId: number; score: number; feedback: string }) => {
      await apiRequest("PUT", `/api/answers/${answerId}/grade`, { score, feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Success",
        description: "Answer graded successfully",
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
        description: "Failed to grade answer",
        variant: "destructive",
      });
    },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-orange-100 text-orange-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatScore = (score: string | number, maxScore: string | number) => {
    return `${score || 0}/${maxScore || 0}`;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Grading Center</h2>
              <p className="text-gray-600 mt-1">Review and grade student submissions</p>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="exam">Exam</Label>
                    <Select value={selectedExam} onValueChange={setSelectedExam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams?.map((exam: any) => (
                          <SelectItem key={exam.id} value={exam.id.toString()}>
                            {exam.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Submissions</SelectItem>
                        <SelectItem value="submitted">Needs Grading</SelectItem>
                        <SelectItem value="graded">Graded</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sort">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submission_date">Submission Date</SelectItem>
                        <SelectItem value="student_name">Student Name</SelectItem>
                        <SelectItem value="score">Score</SelectItem>
                        <SelectItem value="time_taken">Time Taken</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full">
                      Auto-Grade MCQs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submissions List */}
            {!selectedExam ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">Select an exam to view submissions</p>
                  <p className="text-gray-400">Choose an exam from the dropdown above to start grading</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Student Submissions</CardTitle>
                    {submissions && (
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{submissions.filter((s: any) => s.status === 'submitted').length} pending review</span>
                        <span>{submissions.length} total submissions</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {submissionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse p-6 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : submissions?.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-2">No submissions found</p>
                      <p className="text-gray-400">Students haven't submitted this exam yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {submissions?.map((submission: any) => (
                        <div key={submission.id} className="p-6 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src="" alt="Student" />
                                <AvatarFallback>
                                  {submission.studentId?.substring(0, 2).toUpperCase() || 'ST'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  Student {submission.studentId}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Submitted: {submission.submittedAt ? 
                                    new Date(submission.submittedAt).toLocaleDateString() : 
                                    'In Progress'
                                  }
                                </p>
                                {submission.isLate && (
                                  <p className="text-xs text-red-600 flex items-center mt-1">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Late submission
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-6">
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-900">Score</p>
                                <p className="text-lg font-bold text-green-600">
                                  {submission.totalScore ? 
                                    formatScore(submission.totalScore, submission.maxScore) :
                                    '--/--'
                                  }
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-900">Time</p>
                                <p className="text-sm text-gray-600">
                                  {submission.timeTaken ? formatTime(submission.timeTaken) : '--'}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-900">Status</p>
                                <Badge className={getStatusColor(submission.status)}>
                                  {submission.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <Button 
                                variant={submission.status === 'submitted' ? 'default' : 'outline'}
                                size="sm"
                              >
                                {submission.status === 'submitted' ? 'Grade' : 'Review'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
