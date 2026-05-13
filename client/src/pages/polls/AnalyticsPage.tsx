import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  TrendingUp,
  EyeOff,
  Eye,
  Clock,
  Loader2,
  Send,
  ArrowLeft,
  Wifi,
  WifiOff,
  Globe,
  Crown,
  Zap,
  CheckSquare,
  Copy,
  QrCode,
  ImageDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeModal } from "@/components/QRCodeModal";
import { ResultsCard } from "@/components/ResultsCard";
import { useResultsCardExport } from "@/hooks/useResultsCardExport";
import { apiClient } from "@/api/axios";
import type { ApiResponse, FullAnalytics, QuestionAnalytics, PollStatus } from "@/types";
import { useSocket, type AnalyticsUpdatePayload } from "@/hooks/useSocket";

const getAnalytics = (pollId: string): Promise<FullAnalytics> =>
  apiClient.get<ApiResponse<FullAnalytics>>(`/analytics/${pollId}`).then((r) => r.data.data);

const publishPoll = (pollId: string) =>
  apiClient.post<ApiResponse<{ poll: unknown }>>(`/polls/${pollId}/publish`).then((r) => r.data);

const closePoll = (pollId: string) =>
  apiClient.post<ApiResponse<{ poll: unknown }>>(`/polls/${pollId}/close`).then((r) => r.data);

function useAnimatedCounter(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const start = prev.current;
    if (start === target) return;

    let rafId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return display;
}

const STATUS_CONFIG: Record<
  PollStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  expired: { label: "Expired", variant: "secondary" },
  published: { label: "Published", variant: "outline" },
};

const StatusBadge = ({ status }: { status: PollStatus }) => {
  const c = STATUS_CONFIG[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardDescription className="text-sm font-medium">{label}</CardDescription>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

const QuestionCard = ({
  question,
  index,
  totalResponses,
}: {
  question: QuestionAnalytics;
  index: number;
  totalResponses: number;
}) => {
  const topOption = question.options.reduce<QuestionAnalytics["options"][number] | null>(
    (top, opt) => (top === null || opt.count > top.count ? opt : top),
    null,
  );

  const chartData = question.options.map((o) => ({
    name: o.optionText.length > 18 ? o.optionText.slice(0, 18) + "…" : o.optionText,
    count: o.count,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Question {index + 1}</p>
            <CardTitle className="text-base font-medium leading-snug">
              {question.questionText}
            </CardTitle>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={question.isRequired ? "secondary" : "outline"} className="text-xs">
              {question.isRequired ? "Required" : "Optional"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {question.totalAnswers} answer{question.totalAnswers !== 1 ? "s" : ""}
            </span>
            {question.isRequired && totalResponses > 0 && (
              <span
                className="text-xs"
                style={{
                  color: question.totalAnswers === totalResponses ? "#0D9488" : "#F59E0B",
                }}
              >
                {Math.round((question.totalAnswers / totalResponses) * 100)}% answered
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.totalAnswers > 0 && (
          <div className="mb-4 h-36 w-full">
            <ResponsiveContainer width="100%" height={144}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: unknown) => [Number(value), "Votes"] as [number, string]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {[...question.options]
          .sort((a, b) => b.count - a.count)
          .map((option) => {
            const isLeading = topOption?.optionId === option.optionId && question.totalAnswers > 0;
            return (
              <div key={option.optionId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={[
                      "font-medium truncate max-w-[70%]",
                      isLeading ? "text-primary" : "",
                    ].join(" ")}
                  >
                    {isLeading && (
                      <Crown className="mr-1.5 inline-block h-3.5 w-3.5 text-amber-500" />
                    )}
                    {option.optionText}
                  </span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {option.count} ({option.percentage}%)
                  </span>
                </div>
                <Progress value={option.percentage} className="h-2" />
              </div>
            );
          })}

        {question.totalAnswers === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No answers yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default function AnalyticsPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const queryClient = useQueryClient();

  const {
    data: initial,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analytics", pollId],
    queryFn: () => getAnalytics(pollId!),
    enabled: !!pollId,
    refetchOnWindowFocus: false,
  });

  const [liveData, setLiveData] = useState<FullAnalytics | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const localPublishRef = useRef(false);

  const analytics = liveData ?? initial ?? null;

  const { cardRef, exportCard, isExporting } = useResultsCardExport(analytics?.pollTitle ?? "");

  const animatedResponses = useAnimatedCounter(analytics?.totalResponses ?? 0);

  const completionRate = useMemo(() => {
    if (!analytics || analytics.totalResponses === 0) return 0;
    const required = analytics.questions.filter((q) => q.isRequired);
    if (required.length === 0) return 100;
    const totalRequiredAnswers = required.reduce((sum, q) => sum + q.totalAnswers, 0);
    const maxPossible = required.length * analytics.totalResponses;
    return Math.round((totalRequiredAnswers / maxPossible) * 100);
  }, [analytics]);

  const responseVelocity = useMemo(() => {
    if (!analytics || analytics.dailyTimeline.length === 0 || analytics.totalResponses === 0) {
      return null;
    }
    const firstDate = new Date(analytics.dailyTimeline[0]!.date);
    const now = new Date();
    const hours = Math.max(1, (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60));
    return (analytics.totalResponses / hours).toFixed(1);
  }, [analytics]);

  const handleAnalyticsUpdate = useCallback(
    (payload: AnalyticsUpdatePayload) => {
      setLiveData((prev): FullAnalytics | null => {
        if (!prev) return prev;
        const questions = payload.questions.map((q) => ({
          ...q,
          isRequired:
            prev.questions.find((pq) => pq.questionId === q.questionId)?.isRequired ?? true,
        }));
        const required = questions.filter((q) => q.isRequired);
        const completionRate =
          required.length === 0
            ? 100
            : Math.round(
                (required.reduce((s, q) => s + q.totalAnswers, 0) /
                  (required.length * payload.totalResponses)) *
                  100,
              );
        const updated: FullAnalytics = {
          ...prev,
          totalResponses: payload.totalResponses,
          questions,
          completionRate,
        };
        if (pollId) queryClient.setQueryData(["analytics", pollId], updated);
        return updated;
      });
    },
    [pollId, queryClient],
  );

  const handleResponseCount = useCallback(
    ({ totalResponses }: { totalResponses: number; pollId: string; timestamp: string }) => {
      setLiveData((prev): FullAnalytics | null => {
        if (!prev) return prev;
        const updated = { ...prev, totalResponses };
        if (pollId) queryClient.setQueryData(["analytics", pollId], updated);
        return updated;
      });
    },
    [pollId, queryClient],
  );

  const handlePollPublished = useCallback(() => {
    setLiveData((prev): FullAnalytics | null => {
      if (!prev) return prev;
      const updated = { ...prev, status: "published" as const };
      if (pollId) queryClient.setQueryData(["analytics", pollId], updated);
      return updated;
    });
    if (!localPublishRef.current) {
      toast.success("Poll results are now public!");
    }
    void queryClient.invalidateQueries({ queryKey: ["polls"] });
  }, [pollId, queryClient]);

  const handlePollExpired = useCallback(() => {
    setLiveData((prev): FullAnalytics | null => {
      if (!prev) return prev;
      const updated = { ...prev, status: "expired" as const };
      if (pollId) queryClient.setQueryData(["analytics", pollId], updated);
      return updated;
    });
    if (!localPublishRef.current) {
      toast.info("This poll has expired.");
    }
  }, [pollId, queryClient]);

  const { isConnected } = useSocket({
    pollId: pollId ?? "",
    admin: true,
    onAnalyticsUpdate: handleAnalyticsUpdate,
    onResponseCount: handleResponseCount,
    onPollPublished: handlePollPublished,
    onPollExpired: handlePollExpired,
  });

  const closeAndPublishMutation = useMutation({
    mutationFn: async () => {
      localPublishRef.current = true;
      if (analytics?.status === "active") {
        await closePoll(pollId!);
      }
      return publishPoll(pollId!);
    },
    onSuccess: () => {
      localPublishRef.current = false;
      setLiveData((prev): FullAnalytics | null => (prev ? { ...prev, status: "published" } : prev));
      toast.success("Results published!");
      void queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      localPublishRef.current = false;
      toast.error(err.response?.data?.error ?? "Failed to publish.");
    },
  });

  const copySnapshot = useCallback(() => {
    if (!analytics) return;
    const lines = [
      `📊 Poll: ${analytics.pollTitle}`,
      `📝 ${analytics.totalResponses} response${analytics.totalResponses !== 1 ? "s" : ""}`,
      `✅ Completion rate: ${completionRate}%`,
      "",
      ...analytics.questions.map((q, i) => {
        const top = [...q.options].sort((a, b) => b.count - a.count)[0];
        const leading = top ? `${top.optionText} (${top.percentage}%)` : "No answers yet";
        return `Q${i + 1}: ${q.questionText}\n   → Leading: ${leading}`;
      }),
    ];
    void navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Results summary copied to clipboard!");
  }, [analytics, completionRate]);

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );

  if (error || !analytics)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="mb-4 text-muted-foreground">
          Failed to load analytics. You may not have permission.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Link>
        </Button>
      </div>
    );

  const shareUrl = `${window.location.origin}/polls/${pollId}/respond`;
  const resultsUrl = `${window.location.origin}/polls/${pollId}/results`;
  const canPublish = analytics.status !== "published" && analytics.totalResponses > 0;
  const isActive = analytics.status === "active";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link to="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <h1 className="landing-heading text-2xl font-bold tracking-tight">
            {analytics.pollTitle}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={analytics.status} />
            <Badge
              variant="outline"
              className={[
                "gap-1 text-xs",
                isConnected ? "border-green-200 text-green-600" : "text-muted-foreground",
              ].join(" ")}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copySnapshot}
            disabled={analytics.totalResponses === 0}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy summary
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl);
              toast.success("Poll link copied!");
            }}
          >
            Copy poll link
          </Button>

          <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </Button>

          {analytics.status !== "published" && (
            <Button
              size="sm"
              onClick={() => closeAndPublishMutation.mutate()}
              disabled={!canPublish || closeAndPublishMutation.isPending}
            >
              {closeAndPublishMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isActive ? "Closing…" : "Publishing…"}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {isActive ? "Close & Publish" : "Publish Results"}
                </>
              )}
            </Button>
          )}

          {analytics.status === "published" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(resultsUrl);
                  toast.success("Results link copied!");
                }}
              >
                <Globe className="mr-2 h-4 w-4" /> Copy results link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void exportCard()}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <ImageDown className="mr-2 h-4 w-4" />
                    Share Results
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Responses"
          value={animatedResponses}
          icon={Users}
          description="responses collected"
        />

        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={CheckSquare}
          description={
            completionRate === 100
              ? "All required questions answered"
              : `${100 - completionRate}% skipped a required question`
          }
        />

        <StatCard
          label="Response Velocity"
          value={responseVelocity ? `${responseVelocity}/hr` : "—"}
          icon={Zap}
          description={responseVelocity ? "avg responses per hour" : "not enough data yet"}
        />

        <StatCard
          label="Questions"
          value={analytics.questions.length}
          icon={TrendingUp}
          description="in this poll"
        />

        <StatCard
          label="Anonymous"
          value={analytics.anonymousCount}
          icon={EyeOff}
          description={`${analytics.identifiedCount} identified`}
        />

        <StatCard
          label="Status"
          value={analytics.status.charAt(0).toUpperCase() + analytics.status.slice(1)}
          icon={analytics.status === "published" ? Eye : Clock}
          description={
            analytics.status === "active"
              ? `Closes ${new Date(analytics.expiresAt).toLocaleDateString()}`
              : analytics.status === "published"
                ? "Results are public"
                : "No longer accepting responses"
          }
        />
      </div>

      {analytics.totalResponses === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No responses yet</p>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Share your poll link. This page updates live.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
                toast.success("Poll link copied!");
              }}
            >
              Copy poll link
            </Button>
          </CardContent>
        </Card>
      )}

      {analytics.dailyTimeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response Timeline</CardTitle>
            <CardDescription>Daily submission count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height={192}>
                <LineChart
                  data={analytics.dailyTimeline}
                  margin={{ top: 4, right: 4, left: -24, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: string) =>
                      new Date(val).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label: unknown) =>
                      new Date(String(label)).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(value: unknown) => [Number(value), "Responses"] as [number, string]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {analytics.questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="landing-heading text-lg font-semibold">Question Breakdown</h2>
          {analytics.questions.map((question, index) => (
            <QuestionCard
              key={question.questionId}
              question={question}
              index={index}
              totalResponses={analytics.totalResponses}
            />
          ))}
        </div>
      )}

      {/* Off-screen results card for html2canvas export */}
      <div
        style={{ position: "fixed", top: -9999, left: -9999, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <ResultsCard
          ref={cardRef}
          data={{
            pollTitle: analytics.pollTitle,
            totalResponses: analytics.totalResponses,
            questions: analytics.questions,
            publishedAt: analytics.publishedAt,
          }}
        />
      </div>

      <QRCodeModal
        url={shareUrl}
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        pollTitle={analytics.pollTitle}
      />
    </div>
  );
}
