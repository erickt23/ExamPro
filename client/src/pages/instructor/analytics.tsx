import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  FileText
} from "lucide-react";

export default function InstructorAnalytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: instructorStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/instructor-stats"],
    retry: false,
  });

  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
    retry: false,
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

  // Mock data for demonstration of analytics features
  const questionPerformance = [
    { question: "Question 1: Derivatives", correctRate: 92, difficulty: "medium" },
    { question: "Question 2: Integrals", correctRate: 67, difficulty: "hard" },
    { question: "Question 3: Limits", correctRate: 84, difficulty: "easy" },
    { question: "Question 4: Series", correctRate: 45, difficulty: "hard" },
    { question: "Question 5: Functions", correctRate: 78, difficulty: "medium" },
  ];

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPerformanceTextColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto ml-0 transition-all duration-300">
          <div className="p-3 md:p-6">
            <div className="mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Analytics & Reports</h2>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Insights into student performance and exam effectiveness</p>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Average Score</h3>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">84.2%</p>
                  <p className="text-sm text-green-600 mt-2">↗ 3.2% from last exam</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Completion Rate</h3>
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">96.8%</p>
                  <p className="text-sm text-green-600 mt-2">↗ 1.5% improvement</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Avg. Time</h3>
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">76m</p>
                  <p className="text-sm text-gray-500 mt-2">Out of 90m allowed</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Question Bank</h3>
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? "..." : (instructorStats as any)?.totalQuestions || 0}
                  </p>
                  <p className="text-sm text-green-600 mt-2">+42 this month</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Score distribution chart</p>
                      <p className="text-sm text-gray-400">Chart visualization would appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Question Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {questionPerformance.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 font-medium">{item.question}</p>
                          <p className="text-xs text-gray-500 capitalize">Difficulty: {item.difficulty}</p>
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                          <div className="w-20">
                            <Progress 
                              value={item.correctRate} 
                              className="h-2"
                            />
                          </div>
                          <span className={`text-sm font-medium min-w-[45px] ${getPerformanceTextColor(item.correctRate)}`}>
                            {item.correctRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questionPerformance
                      .filter(q => q.correctRate >= 80)
                      .map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="text-sm text-gray-900">{item.question.split(':')[1]}</span>
                          <span className="text-sm font-medium text-green-600">{item.correctRate}%</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Questions Needing Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questionPerformance
                      .filter(q => q.correctRate < 60)
                      .map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <span className="text-sm text-gray-900">{item.question.split(':')[1]}</span>
                          <span className="text-sm font-medium text-red-600">{item.correctRate}%</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">5 new submissions</p>
                        <p className="text-xs text-gray-500">Calculus Midterm</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">3 pending reviews</p>
                        <p className="text-xs text-gray-500">Physics Quiz</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">12 exams graded</p>
                        <p className="text-xs text-gray-500">Today</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
