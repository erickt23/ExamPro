import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useState, useEffect } from "react";
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
  Settings,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isInstructor = user?.role === 'instructor';

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <aside 
        className={cn(
          "bg-white shadow-sm border-r border-gray-200 overflow-y-auto transition-all duration-300 z-40",
          isCollapsed ? "w-16" : "w-64",
          "md:relative md:translate-x-0 fixed h-full",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        {/* Desktop collapse toggle */}
        <div className="hidden md:block absolute -right-3 top-6 z-10">
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 rounded-full p-0 bg-white shadow-md"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <Menu className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        </div>

        <div className="p-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    if (window.innerWidth < 768) {
                      setIsMobileOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors",
                    isCollapsed ? "justify-center" : "space-x-3",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.title}</span>}
                </button>
              );
            })}
          </nav>
          
          {quickActions.length > 0 && !isCollapsed && (
            <div className="mt-8 pt-4 border-t border-gray-200">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-2">
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
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
