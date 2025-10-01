import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { formatSubmissionTime } from "@/lib/dateUtils";
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
  const { t } = useTranslation();
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
        title: t('auth.unauthorized'),
        description: t('auth.loggedOut'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, t]);

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
          <p className="text-muted-foreground">{t('common.loading')}</p>
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
            name: `${t('common.student')} ${studentId}`,
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
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatLastActivity = (date: Date | null) => {
    if (!date) return t('students.never');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return t('students.justNow');
    if (diffHours < 24) return t('students.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('students.daysAgo', { count: diffDays });
    return formatSubmissionTime(date);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{t('students.title')}</h2>
                <p className="text-muted-foreground mt-1">{t('students.description')}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {t('students.export')}
                </Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('students.addStudent')}
                </Button>
              </div>
            </div>

            {/* Student Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('students.totalStudents')}</p>
                      <p className="text-2xl font-bold text-foreground">
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
                      <p className="text-sm font-medium text-muted-foreground">{t('students.activeStudents')}</p>
                      <p className="text-2xl font-bold text-foreground">
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
                      <p className="text-sm font-medium text-muted-foreground">{t('students.avgPerformance')}</p>
                      <p className="text-2xl font-bold text-foreground">
                        {students.length > 0 ? 
                          `${Math.round(students.reduce((sum: number, s: any) => sum + s.averageScore, 0) / students.length)}%` : 
                          '0%'
                        }
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 dark:text-orange-400 font-bold">%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('students.recentActivity')}</p>
                      <p className="text-2xl font-bold text-foreground">
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
                    <Label htmlFor="search">{t('students.searchStudents')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('students.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="class">{t('students.class')}</Label>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('students.allClasses')}</SelectItem>
                        <SelectItem value="math101">{t('students.math101')}</SelectItem>
                        <SelectItem value="phys201">{t('students.phys201')}</SelectItem>
                        <SelectItem value="chem301">{t('students.chem301')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">{t('students.status')}</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('students.allStatuses')}</SelectItem>
                        <SelectItem value="active">{t('students.active')}</SelectItem>
                        <SelectItem value="inactive">{t('students.inactive')}</SelectItem>
                        <SelectItem value="pending">{t('students.pending')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sort">{t('students.sortBy')}</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">{t('students.name')}</SelectItem>
                        <SelectItem value="grade">{t('students.grade')}</SelectItem>
                        <SelectItem value="activity">{t('students.lastActivity')}</SelectItem>
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
                  <CardTitle>{t('students.students')} ({filteredStudents.length})</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{t('students.activeCount', { count: filteredStudents.filter((s: any) => s.status === 'active').length })}</span>
                    <span>{t('students.pendingCount', { count: filteredStudents.filter((s: any) => s.status === 'pending').length })}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg mb-2">{t('students.noStudentsFound')}</p>
                    <p className="text-muted-foreground">
                      {searchTerm ? t('students.adjustSearch') : t('students.addFirstStudent')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredStudents.map((student: any) => (
                      <div key={student.id} className="p-6 hover:bg-muted">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src="" alt={student.name} />
                              <AvatarFallback>
                                {student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-foreground">{student.name}</h4>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                              <p className="text-xs text-muted-foreground">{t('students.studentId', { id: student.id })}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-8">
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">{t('students.avgScore')}</p>
                              <p className={`text-lg font-bold ${getScoreColor(student.averageScore)}`}>
                                {student.averageScore.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">{t('students.examsTaken')}</p>
                              <p className="text-lg font-bold text-foreground">
                                {student.completedExams}/{student.totalExams}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">{t('students.lastActivity')}</p>
                              <p className="text-sm text-muted-foreground">
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