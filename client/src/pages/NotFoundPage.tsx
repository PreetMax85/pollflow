import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
        <BarChart3 className="h-6 w-6 text-primary-foreground" />
      </div>
      <h1 className="landing-heading text-5xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground max-w-sm">
        This page doesn't exist or you don't have permission to view it.
      </p>
      <Button asChild>
        <Link to="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
