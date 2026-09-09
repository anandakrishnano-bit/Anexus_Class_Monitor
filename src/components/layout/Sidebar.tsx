import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  CalendarDays,
  BookOpen,
  History,
  Settings,
  UserCircle,
  GraduationCap
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { open } = useSidebar();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'schedule', label: 'Timetable', icon: CalendarDays },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'subjects', label: 'Subjects & Faculty', icon: BookOpen },
    { id: 'reports', label: 'History & Exports', icon: History },
    { id: 'profile', label: 'My Profile', icon: UserCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <ShadcnSidebar
      collapsible="icon"
      className={cn(
        "hidden md:flex transition-all duration-300 ease-in-out shrink-0 !top-0 !h-full"
      )}
    >
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1 gap-2">
          {open ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-sm">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs tracking-tight text-neutral-900 dark:text-white block truncate">
                  ANEXUS HUB
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 block truncate">
                  Class Manager
                </span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-sm mb-1">
              <GraduationCap className="w-4 h-4" />
            </div>
          )}
          {open && <SidebarTrigger className="shrink-0" />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveTab(item.id);
                      }}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          isActive
                            ? 'scale-110 text-white dark:text-neutral-900'
                            : 'text-neutral-500 dark:text-neutral-400 group-hover:scale-105'
                        }`}
                      />
                      {open && <span className="flex-1 text-left truncate">{item.label}</span>}
                      {open && isActive && (
                        <SidebarMenuBadge className="w-2 h-2 p-0 bg-[var(--accent-tertiary)] shadow-[0_0_6px_var(--accent-tertiary)] animate-badge-pop" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
          {open ? (
            <>
              <span className="text-[10px] font-semibold">Toggle Sidebar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#262626] text-[10px] font-bold border border-neutral-200 dark:border-neutral-700">
                Ctrl+B
              </kbd>
            </>
          ) : (
            <span className="w-full text-center text-[9px] font-bold">⌘B</span>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
};
