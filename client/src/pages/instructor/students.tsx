import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  UserPlus,
  Download,
  Search,
  Eye,
  Mail,
  Users,
  TrendingUp,
  Clock
} from "lucide-react";

export default function InstructorStudents() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

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

  const { data: submissions } = useQuery({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  const { data: instructorStats } = useQuery({
    queryKey: ["/api/analytics/instructor-stats"],
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

  // Process submissions to get unique students with their stats
  const students = submissions ? 
    Object.values(
      submissions.reduce((acc: any, submission: any) => {
        const studentId = submission.studentId;
        if (!acc[studentId]) {
          acc[studentId] = {
            id: studentId,
            name: `Student ${studentId}`,
            email: `student${studentId}@university.edu`,
            submissions: [],
            totalExams: 0,
            averageScore: 0,
            lastActivity: null,
            status: 'active'
          };
        }
        acc[studentId].submissions.push(submission);
        if (submission.submittedAt) {
          acc[studentId].lastActivity = submission.submittedAt;
        }
        return acc;
      }, {})
    ).map((student: any) => {
      const completedSubmissions = student.submissions.filter((s: any) => s.totalScore !== null);
      const totalScore = completedSubmissions.reduce((sum: number, s: any) => sum + parseFloat(s.totalScore || '0'), 0);
      const totalMaxScore = completedSubmissions.reduce((sum: number, s: any) => sum + parseFloat(s.maxScore || '0'), 0);
      
      return {
        ...student,
        totalExams: student.submissions.length,
        completedExams: completedSubmissions.length,
        averageScore: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
        lastActivity: student.lastActivity ? new Date(student.lastActivity) : null
      };
    }) : [];

  const filteredStudents = students.filter((student: any) => {
    if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !student.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "all" && student.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatLastActivity = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
                <p className="text-gray-600 mt-1">Manage enrolled students and track their progress</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </div>

            {/* Student Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {instructorStats?.totalStudents || students.length || 0}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Students</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {students.filter((s: any) => s.status === 'active').length}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Performance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {students.length > 0 ? 
                          `${Math.round(students.reduce((sum: number, s: any) => sum + s.averageScore, 0) / students.length)}%` : 
                          '0%'
                        }
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 font-bold">%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {students.filter((s: any) => {
                          if (!s.lastActivity) return false;
                          const dayAgo = new Date();
                          dayAgo.setDate(dayAgo.getDate() - 1);
                          return s.lastActivity > dayAgo;
                        }).length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Search Students</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="class">Class</Label>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="math101">Mathematics 101</SelectItem>
                        <SelectItem value="phys201">Physics 201</SelectItem>
                        <SelectItem value="chem301">Chemistry 301</SelectItem>
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
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
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
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="grade">Grade</SelectItem>
                        <SelectItem value="activity">Last Activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Students ({filteredStudents.length})</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Active: {filteredStudents.filter((s: any) => s.status === 'active').length}</span>
                    <span>Pending: {filteredStudents.filter((s: any) => s.status === 'pending').length}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No students found</p>
                    <p className="text-gray-400">
                      {searchTerm ? 'Try adjusting your search terms' : 'Add students to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map((student: any) => (
                      <div key={student.id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src="" alt={student.name} />
                              <AvatarFallback>
                                {student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-gray-900">{student.name}</h4>
                              <p className="text-sm text-gray-600">{student.email}</p>
                              <p className="text-xs text-gray-500">Student ID: {student.id}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-8">
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-900">Avg. Score</p>
                              <p className={`text-lg font-bold ${getScoreColor(student.averageScore)}`}>
                                {student.averageScore.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-900">Exams Taken</p>
                              <p className="text-lg font-bold text-gray-900">
                                {student.completedExams}/{student.totalExams}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-900">Last Activity</p>
                              <p className="text-sm text-gray-600">
                                {formatLastActivity(student.lastActivity)}
                              </p>
                            </div>
                            <div className="text-center">
                              <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                                {student.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
