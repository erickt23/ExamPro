import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BarChart3,
  BookOpen,
  CheckCircle,
  FileText,
  LayoutDashboard,
  Plus,
  Users,
  GraduationCap,
  ClipboardList,
  Notebook,
  PenTool,
  Settings
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const isInstructor = user?.role === 'instructor';

  const instructorNavItems = [
    {
      title: t('nav.dashboard'),
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: t('nav.examQuestionBank'),
      href: "/questions",
      icon: BookOpen,
    },
    {
      title: t('nav.assignmentQuestionBank'),
      href: "/homework-questions",
      icon: PenTool,
    },
    {
      title: t('nav.assignmentManagement'),
      href: "/homework",
      icon: Notebook,
    },
    {
      title: t('nav.examManagement'),
      href: "/exams",
      icon: FileText,
    },
    {
      title: t('nav.grading'),
      href: "/grading",
      icon: CheckCircle,
    },
    {
      title: t('nav.analytics'),
      href: "/analytics",
      icon: BarChart3,
    },
    {
      title: t('nav.students'),
      href: "/students",
      icon: Users,
    },
    {
      title: t('nav.settings'),
      href: "/settings",
      icon: Settings,
    },
  ];

  const studentNavItems = [
    {
      title: t('nav.dashboard'),
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: t('nav.homework'),
      href: "/homework",
      icon: Notebook,
    },
    {
      title: t('nav.exams'),
      href: "/exams",
      icon: FileText,
    },
    {
      title: t('nav.grades'),
      href: "/grades",
      icon: ClipboardList,
    },
  ];

  const navItems = isInstructor ? instructorNavItems : studentNavItems;

  const quickActions = isInstructor ? [
    {
      title: "New Question",
      icon: Plus,
      action: () => {
        // This would open the create question modal
        console.log("Create question");
      },
    },
    {
      title: "New Exam",
      icon: Plus,
      action: () => {
        // This would open the create exam modal
        console.log("Create exam");
      },
    },
  ] : [];

  return (
    <aside className={cn("w-64 bg-white shadow-sm border-r border-gray-200 overflow-y-auto", className)}>
      <div className="p-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>
        
        {quickActions.length > 0 && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quick Actions
              </h3>
            </div>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <action.icon className="h-5 w-5" />
                <span>{action.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
