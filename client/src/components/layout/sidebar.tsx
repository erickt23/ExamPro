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
  X,
  ChevronDown,
  ChevronRight
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
  const [expandedAccordions, setExpandedAccordions] = useState<{ [key: string]: boolean }>({
    examManagement: true,
    assignmentManagement: true
  });

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
  ];

  const instructorAccordionItems = [
    {
      id: 'examManagement',
      title: t('nav.examManagement'),
      icon: GraduationCap,
      items: [
        {
          title: t('nav.questionBank'),
          href: "/questions",
          icon: BookOpen,
        },
        {
          title: t('nav.exams'),
          href: "/exams",
          icon: FileText,
        },
      ]
    },
    {
      id: 'assignmentManagement',
      title: t('nav.assignmentManagement'),
      icon: Notebook,
      items: [
        {
          title: t('nav.assignmentBank'),
          href: "/homework-questions",
          icon: PenTool,
        },
        {
          title: t('nav.assignments'),
          href: "/homework",
          icon: ClipboardList,
        },
      ]
    }
  ];

  const instructorBottomNavItems = [
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

  const toggleAccordion = (accordionId: string) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [accordionId]: !prev[accordionId]
    }));
  };

  const isAccordionItemActive = (accordionItems: any[]) => {
    return accordionItems.some(item => item.href === location);
  };

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
          "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 shadow-lg border-r border-indigo-200/30 transition-all duration-300 z-40",
          isCollapsed ? "w-16 overflow-hidden" : "w-64 overflow-y-auto",
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
            className="h-6 w-6 rounded-full p-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg hover:from-blue-600 hover:to-indigo-700"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <Menu className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        </div>

        <div className={cn("transition-all duration-300", isCollapsed ? "p-2" : "p-4")}>
          <nav className="space-y-2">
            {/* Regular navigation items */}
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
                    "w-full flex items-center px-3 py-2 rounded-xl text-left transition-all duration-200 group",
                    isCollapsed ? "justify-center" : "space-x-3",
                    isActive
                      ? "text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg transform scale-105"
                      : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-indigo-500/20 hover:text-indigo-700 hover:shadow-md hover:transform hover:scale-105"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-all duration-200",
                    isActive ? "text-white drop-shadow-sm" : "text-gray-600 group-hover:text-indigo-600"
                  )} />
                  {!isCollapsed && <span className={cn("truncate font-medium", isActive ? "text-white" : "text-gray-700 group-hover:text-indigo-700")}>{item.title}</span>}
                </button>
              );
            })}

            {/* Accordion items for instructor */}
            {isInstructor && instructorAccordionItems.map((accordion) => {
              const isExpanded = expandedAccordions[accordion.id];
              const hasActiveChild = isAccordionItemActive(accordion.items);
              
              return (
                <div key={accordion.id} className="space-y-1">
                  {/* Accordion Header */}
                  <button
                    onClick={() => !isCollapsed && toggleAccordion(accordion.id)}
                    className={cn(
                      "w-full flex items-center px-3 py-2 rounded-xl text-left transition-all duration-200 group",
                      isCollapsed ? "justify-center" : "justify-between",
                      hasActiveChild
                        ? "text-indigo-700 bg-gradient-to-r from-blue-400/30 to-indigo-500/30 shadow-md"
                        : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-indigo-500/20 hover:text-indigo-700 hover:shadow-md hover:transform hover:scale-105"
                    )}
                    title={isCollapsed ? accordion.title : undefined}
                  >
                    <div className={cn(
                      "flex items-center",
                      isCollapsed ? "justify-center" : "space-x-3"
                    )}>
                      <accordion.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-all duration-200",
                        hasActiveChild ? "text-indigo-600" : "text-gray-600 group-hover:text-indigo-600"
                      )} />
                      {!isCollapsed && (
                        <span className={cn(
                          "truncate font-medium",
                          hasActiveChild ? "text-indigo-700" : "text-gray-700 group-hover:text-indigo-700"
                        )}>
                          {accordion.title}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="transition-transform duration-200">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </button>
                  
                  {/* Accordion Content */}
                  {!isCollapsed && isExpanded && (
                    <div className="pl-6 space-y-1 animate-in slide-in-from-top-1 duration-200">
                      {accordion.items.map((subItem) => {
                        const isActive = location === subItem.href;
                        return (
                          <button
                            key={subItem.href}
                            onClick={() => {
                              setLocation(subItem.href);
                              if (window.innerWidth < 768) {
                                setIsMobileOpen(false);
                              }
                            }}
                            className={cn(
                              "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 group text-sm",
                              isActive
                                ? "text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg transform scale-105"
                                : "text-gray-600 hover:bg-gradient-to-r hover:from-blue-400/15 hover:to-indigo-500/15 hover:text-indigo-600 hover:shadow-sm hover:transform hover:scale-105"
                            )}
                          >
                            <subItem.icon className={cn(
                              "h-4 w-4 flex-shrink-0 transition-all duration-200",
                              isActive ? "text-white drop-shadow-sm" : "text-gray-500 group-hover:text-indigo-500"
                            )} />
                            <span className={cn("truncate font-medium", isActive ? "text-white" : "text-gray-600 group-hover:text-indigo-600")}>{subItem.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom navigation items for instructor */}
            {isInstructor && instructorBottomNavItems.map((item) => {
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
                    "w-full flex items-center px-3 py-2 rounded-xl text-left transition-all duration-200 group",
                    isCollapsed ? "justify-center" : "space-x-3",
                    isActive
                      ? "text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg transform scale-105"
                      : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-indigo-500/20 hover:text-indigo-700 hover:shadow-md hover:transform hover:scale-105"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-all duration-200",
                    isActive ? "text-white drop-shadow-sm" : "text-gray-600 group-hover:text-indigo-600"
                  )} />
                  {!isCollapsed && <span className={cn("truncate font-medium", isActive ? "text-white" : "text-gray-700 group-hover:text-indigo-700")}>{item.title}</span>}
                </button>
              );
            })}
          </nav>
          
          {quickActions.length > 0 && !isCollapsed && (
            <div className="mt-8 pt-4 border-t border-indigo-200/40">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent uppercase tracking-wider">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-green-400/20 hover:to-emerald-500/20 hover:text-emerald-700 hover:shadow-md transition-all duration-200 transform hover:scale-105 group"
                  >
                    <action.icon className="h-5 w-5 text-gray-600 group-hover:text-emerald-600 transition-colors duration-200" />
                    <span className="font-medium">{action.title}</span>
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
