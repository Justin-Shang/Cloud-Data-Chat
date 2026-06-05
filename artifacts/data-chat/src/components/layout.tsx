import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Database, Home, MessageSquare } from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarProvider,
  SidebarTrigger
} from "./ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { label: "首页", href: "/", icon: Home },
    { label: "数据集", href: "/datasets", icon: Database },
    { label: "对话助手", href: "/chat", icon: MessageSquare },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-background">
        <Sidebar className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 font-semibold text-sidebar-foreground">
              <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <span>数据对话</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))}
                        className="my-1"
                      >
                        <Link href={item.href} className="flex items-center gap-3 w-full">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex-shrink-0 flex items-center px-6 border-b bg-card shadow-sm sticky top-0 z-10 md:hidden">
            <SidebarTrigger className="-ml-2 mr-2" />
            <span className="font-medium">数据对话</span>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
