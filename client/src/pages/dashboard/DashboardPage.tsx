/**
 * @file src/pages/dashboard/DashboardPage.tsx
 *
 * Shows all polls created by the authenticated user.
 * Actions per poll depend on status:
 *   active   → Edit · Analytics · Delete · Copy link
 *   expired  → Analytics · Publish · Delete
 *   published→ Analytics · Results · Delete
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, isPast } from "date-fns";
import { toast } from "sonner";
import {
  PlusCircle,
  BarChart3,
  Trash2,
  Pencil,
  Globe,
  Link2,
  CheckCircle2,
  Clock,
  Copy,
  XCircle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { pollsApi } from "@/api/polls";
import { selectUser, useAuthStore } from "@/store/useAuthStore";
import type { Poll, PollStatus } from "@/types";

/** Safely extract poll ID — handles both toJSON (id) and lean() (_id) responses */
const getPollId = (poll: Poll): string => poll.id ?? poll._id ?? "";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PollStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
  published: {
    label: "Published",
    variant: "secondary",
    icon: <Globe className="h-3 w-3" />,
  },
};

// ─── Poll Card ────────────────────────────────────────────────────────────────

interface PollCardProps {
  poll: Poll;
  onDelete: (poll: Poll) => void;
  onDuplicate: (poll: Poll) => void;
  onClose: (poll: Poll) => void;
  onPublish: (poll: Poll) => void;
  isClosing: boolean;
  isPublishing: boolean;
  isDuplicating: boolean;
}

function PollCard({
  poll,
  onDelete,
  onDuplicate,
  onClose,
  onPublish,
  isClosing,
  isPublishing,
  isDuplicating,
}: PollCardProps) {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[poll.status];
  const expiryDate = new Date(poll.expiresAt);
  const respondUrl = `${window.location.origin}/polls/${getPollId(poll)}/respond`;

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(respondUrl);
    toast.success("Link copied to clipboard");
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2">{poll.title}</CardTitle>
          <Badge variant={status.variant} className="flex items-center gap-1 shrink-0 text-xs">
            {status.icon}
            {status.label}
          </Badge>
        </div>
        {poll.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{poll.description}</p>
        )}
      </CardHeader>

      <CardContent className="pb-3 flex-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {poll.totalResponses} response{poll.totalResponses !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isPast(expiryDate)
              ? `Expired ${formatDistanceToNow(expiryDate, { addSuffix: true })}`
              : `Expires ${formatDistanceToNow(expiryDate, { addSuffix: true })}`}
          </span>
          <span>
            {poll.questions.length} question{poll.questions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex flex-wrap gap-2">
        {/* Analytics — always available */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/polls/${getPollId(poll)}/analytics`)}
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          Analytics
        </Button>

        {/* Edit — only while active */}
        {poll.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/polls/${getPollId(poll)}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        )}

        {/* Copy link — only while active */}
        {poll.status === "active" && (
          <Button size="sm" variant="outline" onClick={handleCopyLink}>
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Copy link
          </Button>
        )}

        {/* Duplicate — always available */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDuplicate(poll)}
          disabled={isDuplicating}
        >
          {isDuplicating ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Copy className="h-3.5 w-3.5 mr-1.5" />
          )}
          Duplicate
        </Button>

        {/* Close — only while active, stops accepting responses */}
        {poll.status === "active" && (
          <Button size="sm" variant="outline" onClick={() => onClose(poll)} disabled={isClosing}>
            {isClosing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
            )}
            Close
          </Button>
        )}

        {/* Publish — only when expired */}
        {poll.status === "expired" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPublish(poll)}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5 mr-1.5" />
            )}
            Publish results
          </Button>
        )}

        {/* Public results link — only when published */}
        {poll.status === "published" && (
          <Button size="sm" variant="outline" asChild>
            <Link to={`/polls/${getPollId(poll)}/results`}>
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              Results
            </Link>
          </Button>
        )}

        {/* Delete — always available */}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
          onClick={() => onDelete(poll)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function PollCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-full mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-32" />
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </CardFooter>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore(selectUser);
  const queryClient = useQueryClient();
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["polls", "my"],
    queryFn: () => pollsApi.getMyPolls(),
  });

  const deleteMutation = useMutation({
    mutationFn: (pollId: string) => pollsApi.delete(pollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["polls", "my"] });
      toast.success("Poll deleted");
      setPollToDelete(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Failed to delete poll"),
  });

  const closeMutation = useMutation({
    mutationFn: (pollId: string) => pollsApi.close(pollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["polls", "my"] });
      toast.success("Poll closed");
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Failed to close poll"),
  });

  const publishMutation = useMutation({
    mutationFn: (pollId: string) => pollsApi.publish(pollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["polls", "my"] });
      toast.success("Results published!");
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Failed to publish results"),
  });

  const duplicateMutation = useMutation({
    mutationFn: (pollId: string) => pollsApi.duplicate(pollId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["polls", "my"] });
      toast.success("Poll duplicated");
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Failed to duplicate poll"),
  });

  // Defensive: handle both { polls: Poll[] } and Poll[] response shapes
  const rawData = data?.data;
  const polls: Poll[] = Array.isArray(rawData) ? rawData : (rawData?.polls ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="landing-heading text-2xl">My Polls</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.name}</p>
        </div>
        <Button asChild>
          <Link to="/polls/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            New poll
          </Link>
        </Button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PollCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Failed to load polls. Please refresh the page.
        </div>
      )}

      {!isLoading && !isError && polls.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No polls yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create your first poll and start collecting responses.
          </p>
          <Button asChild>
            <Link to="/polls/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create poll
            </Link>
          </Button>
        </div>
      )}

      {!isLoading && polls.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <PollCard
              key={getPollId(poll)}
              poll={poll}
              onDelete={setPollToDelete}
              onDuplicate={(p) => duplicateMutation.mutate(getPollId(p))}
              onClose={(p) => closeMutation.mutate(getPollId(p))}
              onPublish={(p) => publishMutation.mutate(getPollId(p))}
              isClosing={closeMutation.isPending}
              isPublishing={publishMutation.isPending}
              isDuplicating={duplicateMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={pollToDelete !== null} onOpenChange={(open) => !open && setPollToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete poll?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{pollToDelete?.title}&rdquo; and all its
              responses. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPollToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (pollToDelete) deleteMutation.mutate(getPollId(pollToDelete));
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
