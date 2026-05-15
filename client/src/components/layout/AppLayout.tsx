/**
 *
 * Authenticated shell — wraps every protected page.
 * Renders the top nav bar and a centred content area.
 * The <Outlet /> is where React Router injects the active child page.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LayoutDashboard, PlusCircle, LogOut, BarChart3, Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuthStore, selectUser } from "@/store/useAuthStore";
import { apiClient } from "@/api/axios";

//  Nav Links 

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/polls/create", label: "Create Poll", icon: PlusCircle },
] as const;

//  Helpers 

/** Returns up-to-2-char initials from a display name. */
const getInitials = (name: string): string =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();

// Component 

export default function AppLayout() {
  const user = useAuthStore(selectUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  //  Logout
  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
    } finally {
      clearAuth();
      toast.success("Logged out successfully");
      navigate("/auth/login", { replace: true });
    }
  };

  // Nav link class helper 
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-secondary text-secondary-foreground"
        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
    ].join(" ");

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav Bar  */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <BarChart3 className="h-5 w-5" />
            <span>PollFlow</span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right: User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user ? getInitials(user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="cursor-pointer"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Light mode
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Dark mode
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="border-t border-border px-4 pb-3 pt-2 sm:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
              <Separator className="my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
