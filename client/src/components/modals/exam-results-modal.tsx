import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  Users,
  Target,
  Clock,
  TrendingUp,
  Award,
  FileText,
  Eye
} from "lucide-react";

interface ExamResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number | null;
}

export default function ExamResultsModal({ open, onOpenChange, examId }: ExamResultsModalProps) {
  const { toast } = useToast();

  // Fetch exam details
  const { data: examData } = useQuery({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      if (!examId) return null;
      const response = await fetch(`/api/exams/${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  // Fetch exam analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics/exam", examId],
    queryFn: async () => {
      if (!examId) return null;
      const response = await fetch(`/api/analytics/exam/${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  // Fetch submissions for this exam
  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/submissions", { examId }],
    queryFn: async () => {
      if (!examId) return [];
      const response = await fetch(`/api/submissions?examId=${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  if (!examData) {
    return null;
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Exam Results: {examData.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.totalSubmissions || 0}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.averageScore ? `${Math.round(analytics.averageScore)}%` : "0%"}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.completionRate ? `${Math.round(analytics.completionRate)}%` : "0%"}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.averageTime ? formatTime(analytics.averageTime) : "0m"}
                      </p>
                    </div>
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exam Information */}
            <Card>
              <CardHeader>
                <CardTitle>Exam Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{examData.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Points:</span>
                      <span className="font-medium">{examData.totalPoints} points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attempts Allowed:</span>
                      <span className="font-medium">
                        {examData.attemptsAllowed === -1 ? 'Unlimited' : examData.attemptsAllowed}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusBadgeColor(examData.status)}>
                        {examData.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Show Results:</span>
                      <span className="font-medium">
                        {examData.showResultsImmediately ? 'Immediately' : 'After review'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Randomize Questions:</span>
                      <span className="font-medium">
                        {examData.randomizeQuestions ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Submissions ({submissions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission: any) => (
                      <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium">Student ID: {submission.studentId}</p>
                            <Badge className={getStatusBadgeColor(submission.status)}>
                              {submission.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>
                            <span>Time Taken: {formatTime(submission.timeTaken || 0)}</span>
                            {submission.status === 'graded' && (
                              <span className="font-medium text-green-600">
                                Score: {submission.totalScore}/{submission.maxScore} 
                                ({Math.round((submission.totalScore / submission.maxScore) * 100)}%)
                              </span>
                            )}
                          </div>
                        </div>
                        {submission.status === 'pending' && (
                          <button
                            onClick={() => window.location.href = `/grading/${submission.id}`}
                            className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Grade
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Score Distribution</h4>
                    <div className="space-y-2">
                      {submissions.filter((s: any) => s.status === 'graded').length === 0 ? (
                        <p className="text-gray-500 text-sm">No graded submissions yet</p>
                      ) : (
                        <div className="space-y-2">
                          {['90-100%', '80-89%', '70-79%', '60-69%', 'Below 60%'].map((range, index) => {
                            const gradedSubmissions = submissions.filter((s: any) => s.status === 'graded');
                            let count = 0;
                            
                            gradedSubmissions.forEach((s: any) => {
                              const percentage = (s.totalScore / s.maxScore) * 100;
                              if (index === 0 && percentage >= 90) count++;
                              else if (index === 1 && percentage >= 80 && percentage < 90) count++;
                              else if (index === 2 && percentage >= 70 && percentage < 80) count++;
                              else if (index === 3 && percentage >= 60 && percentage < 70) count++;
                              else if (index === 4 && percentage < 60) count++;
                            });
                            
                            const percentage = gradedSubmissions.length > 0 ? (count / gradedSubmissions.length) * 100 : 0;
                            
                            return (
                              <div key={range} className="flex items-center justify-between">
                                <span className="text-sm">{range}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Status Summary</h4>
                    <div className="space-y-2">
                      {['graded', 'pending', 'submitted'].map((status) => {
                        const count = submissions.filter((s: any) => s.status === status).length;
                        const percentage = submissions.length > 0 ? (count / submissions.length) * 100 : 0;
                        
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusBadgeColor(status)} variant="outline">
                                {status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}