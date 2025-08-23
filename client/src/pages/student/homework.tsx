import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatEasternTime } from "@/lib/dateUtils";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen,
  Clock,
  Play,
  CheckCircle,
  Search,
  Calendar,
  Users,
  FileText
} from "lucide-react";

interface HomeworkAssignment {
  id: number;
  title: string;
  description: string;
  subjectId: number;
  dueDate: string | null;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  attemptsAllowed: number;
  showResultsImmediately: boolean;
}

interface Subject {
  id: number;
  name: string;
  description?: string;
}

export default function StudentHomework() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

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

  // Fetch homework assignments (only active ones for students)
  const { data: homework = [], isLoading: homeworkLoading } = useQuery<HomeworkAssignment[]>({
    queryKey: ["/api/homework"],
    enabled: true,
  });

  // Fetch subjects for filtering
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch homework submissions for the current student
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: ["/api/homework-submissions"],
    enabled: isAuthenticated,
  });

  // Filter homework assignments
  const filteredHomework = homework.filter(hw => {
    const matchesSearch = hw.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || hw.subjectId.toString() === subjectFilter;
    return matchesSearch && matchesSubject && hw.status === 'active';
  });

  const getStatusInfo = (homework: HomeworkAssignment) => {
    if (!homework.dueDate) {
      return { status: "no-deadline", color: "bg-blue-100 text-blue-800", text: "No Deadline" };
    }

    const now = new Date();
    const dueDate = new Date(homework.dueDate);
    const timeLeft = dueDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    if (timeLeft < 0) {
      return { status: "overdue", color: "bg-red-100 text-red-800", text: "Overdue" };
    } else if (daysLeft <= 1) {
      return { status: "due-soon", color: "bg-orange-100 text-orange-800", text: "Due Soon" };
    } else if (daysLeft <= 7) {
      return { status: "due-this-week", color: "bg-yellow-100 text-yellow-800", text: `${daysLeft} days left` };
    } else {
      return { status: "upcoming", color: "bg-green-100 text-green-800", text: `${daysLeft} days left` };
    }
  };

  const getHomeworkSubmissionInfo = (homeworkId: number) => {
    const submission = submissions.find(s => s.homeworkId === homeworkId);
    if (!submission) {
      return { isSubmitted: false, attemptNumber: 0, status: null };
    }
    return { 
      isSubmitted: true, 
      attemptNumber: submission.attemptNumber || 1,
      status: submission.status,
      submittedAt: submission.submittedAt
    };
  };

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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="h-8 w-8" />
                  Homework Assignments
                </h1>
                <p className="text-gray-600 mt-1">
                  Practice with homework assignments to strengthen your understanding
                </p>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder={t('assignments.searchHomeworkAssignments')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Homework Assignments List */}
            {homeworkLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredHomework.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No homework assignments found</h3>
                      <p className="text-gray-500">
                        {searchTerm || subjectFilter !== "all" 
                          ? "Try adjusting your search criteria"
                          : "Check back later for new homework assignments"
                        }
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredHomework.map((hw) => {
                    const statusInfo = getStatusInfo(hw);
                    const subject = subjects.find(s => s.id === hw.subjectId);
                    const submissionInfo = getHomeworkSubmissionInfo(hw.id);
                    
                    return (
                      <Card key={hw.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-semibold text-gray-900">{hw.title}</h3>
                                <Badge className={statusInfo.color}>
                                  {statusInfo.text}
                                </Badge>
                                <Badge variant="outline">
                                  {subject?.name || 'Unknown Subject'}
                                </Badge>
                                {submissionInfo.isSubmitted && (
                                  <Badge className="bg-green-100 text-green-800">
                                    Submitted
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-gray-600 mb-4 line-clamp-2">{hw.description}</p>
                              
                              <div className="flex items-center gap-6 text-sm text-gray-500">
                                {hw.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Due: {formatEasternTime(hw.dueDate, { includeTime: true, includeDate: true })}
                                  </span>
                                )}
                                
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {hw.attemptsAllowed === -1 ? 'Unlimited attempts' : `${hw.attemptsAllowed} attempt${hw.attemptsAllowed !== 1 ? 's' : ''}`}
                                </span>
                                
                                {submissionInfo.isSubmitted && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Attempt #{submissionInfo.attemptNumber}
                                  </span>
                                )}
                                
                                {submissionInfo.isSubmitted && submissionInfo.submittedAt && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Last submitted: {formatEasternTime(submissionInfo.submittedAt, { includeTime: true, includeDate: true })}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <Button
                                onClick={() => {
                                  window.location.href = `/homework/${hw.id}/take`;
                                }}
                                disabled={statusInfo.status === "overdue"}
                                className={`flex items-center gap-2 ${!submissionInfo.isSubmitted ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105' : ''}`}
                                variant={submissionInfo.isSubmitted ? "outline" : "default"}
                              >
                                <Play className="h-4 w-4" />
                                {submissionInfo.isSubmitted ? 'Edit Submission' : 'Start Homework'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}