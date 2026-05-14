import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  Loader2,
  Send,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";

// ✅ types from @/types, api calls from @/api/polls
import { pollsApi } from "@/api/polls";
import type { Poll, PollQuestion } from "@/types";
import { submitResponse } from "@/api/responses";
import { useAuthStore, selectIsAuthenticated, selectUser } from "@/store/useAuthStore";
import { useSocket } from "@/hooks/useSocket";
import { useCountdown } from "@/hooks/useCountdown";

type FormValues = Record<string, string>;

const buildFormSchema = (questions: PollQuestion[]): z.ZodObject<Record<string, z.ZodTypeAny>> => {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    // Use _id — backend subdocuments don't have toJSON transform, keep _id
    shape[q._id] = q.isRequired
      ? z.string().min(1, `"${q.text}" is required`)
      : z.string().optional().default("");
  }
  return z.object(shape);
};

const formatExpiry = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const isPollExpired = (poll: Poll): boolean =>
  poll.status === "expired" || new Date(poll.expiresAt) <= new Date();

interface StatusScreenProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const StatusScreen = ({ icon, title, description, action }: StatusScreenProps) => (
  <div className="flex min-h-screen items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  </div>
);

interface QuestionCardProps {
  question: PollQuestion;
  index: number;
  value: string;
  onChange: (optionId: string) => void;
  error: string | undefined;
}

const QuestionCard = ({ question, index, value, onChange, error }: QuestionCardProps) => (
  <Card className={error ? "border-destructive" : ""}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-2">
        <Label className="text-base font-medium leading-snug">
          <span className="mr-2 text-sm font-normal text-muted-foreground">Q{index + 1}.</span>
          {question.text}
        </Label>
        <Badge variant={question.isRequired ? "secondary" : "outline"} className="shrink-0 text-xs">
          {question.isRequired ? "Required" : "Optional"}
        </Badge>
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </CardHeader>
    <CardContent>
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="space-y-2">
          {[...question.options]
            .sort((a, b) => a.order - b.order)
            .map((option) => (
              <Label
                key={option._id}
                htmlFor={option._id}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors",
                  value === option._id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                ].join(" ")}
              >
                <RadioGroupItem value={option._id} id={option._id} />
                <span className="flex-1 cursor-pointer font-normal">{option.text}</span>
              </Label>
            ))}
        </div>
      </RadioGroup>
    </CardContent>
  </Card>
);

interface IdentityBannerProps {
  poll: Poll;
  pollId: string;
}

const IdentityBanner = ({ poll, pollId }: IdentityBannerProps) => {
  const user = useAuthStore(selectUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (poll.isAnonymous) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        <div>
          <p className="text-sm font-medium text-teal-700">Anonymous poll</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your identity will not be stored or shown in the results, regardless of whether
            you&apos;re signed in.
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
        <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Responding as {user.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {user.email} &middot; Your response will be attributed to your account. You can only
            respond once.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
      <UserX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">Responding anonymously</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          You&apos;re not signed in. Your response won&apos;t be linked to an account.{" "}
          <Link
            to={`/auth/login?redirect=/polls/${pollId}/respond`}
            className="underline underline-offset-2"
          >
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default function RespondPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isExpiredBySocket, setIsExpiredBySocket] = useState(false);

  // ✅ unwrap ApiResponse envelope → data.poll is the Poll object
  const {
    data: poll,
    isLoading,
    error,
  } = useQuery<Poll, Error>({
    queryKey: ["poll", pollId],
    queryFn: () => pollsApi.getById(pollId!).then((r) => r.data),
    enabled: !!pollId,
    retry: false,
  });

  const handlePollExpired = useCallback(() => {
    setIsExpiredBySocket(true);
    toast.error("This poll has just expired.");
  }, []);

  const handlePollPublished = useCallback(() => {
    toast.info("Results have been published!");
    navigate(`/polls/${pollId}/results`, { replace: true });
  }, [navigate, pollId]);

  useSocket({
    pollId: pollId ?? "",
    onPollExpired: handlePollExpired,
    onPollPublished: handlePollPublished,
  });

  const countdown = useCountdown(poll?.expiresAt ?? new Date().toISOString());

  // Timer fallback: if the socket disconnects, force expiry UI at the deadline
  useEffect(() => {
    if (!poll || poll.status !== "active") return;

    const remaining = new Date(poll.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      setIsExpiredBySocket(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsExpiredBySocket(true);
    }, remaining);

    return () => clearTimeout(timer);
  }, [poll]);

  useEffect(() => {
    if (poll?.status === "published") {
      navigate(`/polls/${pollId}/results`, { replace: true });
    }
  }, [poll?.status, pollId, navigate]);

  const schema = poll ? buildFormSchema(poll.questions) : z.object({});

  const defaultFormValues = useMemo(() => {
    if (!poll) return {};
    const values: Record<string, string> = {};
    for (const q of poll.questions) {
      values[q._id] = "";
    }
    return values;
  }, [poll]);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: defaultFormValues,
  });

  const formValues = watch();
  const totalQuestions = poll?.questions.length ?? 0;
  const answered = Object.values(formValues).filter((v): v is string => !!v).length;
  const progressPercent = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const answers = Object.entries(values)
        .filter(([, optionId]) => !!optionId)
        .map(([questionId, optionId]) => ({ questionId, optionId }));
      return submitResponse(pollId!, { answers });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Response submitted!");
    },
    onError: (err: { response?: { data?: { error?: string }; status?: number } }) => {
      const status = err.response?.status;
      if (status === 409) toast.error("You have already responded to this poll.");
      else if (status === 401) toast.error("You need to be logged in to respond.");
      else toast.error(err.response?.data?.error ?? "Failed to submit.");
    },
  });

  if (isLoading)
    return (
      <StatusScreen
        icon={<Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />}
        title="Loading poll…"
        description="Please wait."
      />
    );
  if (error || !poll)
    return (
      <StatusScreen
        icon={<XCircle className="h-7 w-7 text-destructive" />}
        title="Poll not found"
        description="This link may be invalid."
        action={
          <Button asChild variant="outline">
            <Link to="/">Go home</Link>
          </Button>
        }
      />
    );
  if (poll?.status === "published") return null;
  if (isPollExpired(poll) || isExpiredBySocket)
    return (
      <StatusScreen
        icon={<Clock className="h-7 w-7 text-muted-foreground" />}
        title="Poll has expired"
        description={`Closed on ${formatExpiry(poll.expiresAt)}.`}
      />
    );
  if (poll.requiresAuth && !isAuthenticated)
    return (
      <StatusScreen
        icon={<Lock className="h-7 w-7 text-muted-foreground" />}
        title="Login required"
        description="You must be logged in to respond."
        action={
          <Button asChild>
            <Link to="/auth/login" state={{ from: `/polls/${pollId}/respond` }}>
              Login to respond
            </Link>
          </Button>
        }
      />
    );
  if (isSubmitted)
    return (
      <StatusScreen
        icon={<CheckCircle2 className="h-7 w-7 text-green-500" />}
        title="Response submitted!"
        description="Thank you for your feedback."
        action={
          <p className="text-sm text-muted-foreground">
            Results will be available once the creator publishes them.
          </p>
        }
      />
    );

  const sortedQuestions = [...poll.questions].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            PollFlow
          </div>
          <div
            className={[
              "flex items-center gap-1.5 text-xs",
              countdown.isUrgent ? "text-destructive font-medium" : "text-muted-foreground",
            ].join(" ")}
          >
            {countdown.isUrgent ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {countdown.isClosed ? "Poll closed" : `Closes in ${countdown.display}`}
          </div>
        </div>
        <Progress value={progressPercent} className="h-0.5 rounded-none" />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {poll.isAnonymous && <Badge variant="secondary">Anonymous</Badge>}
            {poll.requiresAuth && (
              <Badge variant="outline">
                <Lock className="mr-1 h-3 w-3" />
                Login required
              </Badge>
            )}
          </div>
          <h1 className="landing-heading text-2xl">{poll.title}</h1>
          {poll.description && <p className="mt-2 text-muted-foreground">{poll.description}</p>}
          <p className="mt-3 text-xs text-muted-foreground">
            {answered} of {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} answered
          </p>
        </div>

        <IdentityBanner poll={poll} pollId={pollId!} />

        {countdown.totalSeconds > 0 && countdown.totalSeconds < 300 && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Less than 5 minutes left — submit before the poll closes.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit((v) => submitMutation.mutate(v))} className="space-y-5">
          {sortedQuestions.map((question, index) => (
            <QuestionCard
              key={question._id}
              question={question}
              index={index}
              value={formValues[question._id] ?? ""}
              onChange={(optionId) => setValue(question._id, optionId, { shouldValidate: true })}
              error={errors[question._id]?.message}
            />
          ))}
          <div className="pt-2">
            <Button type="submit" className="w-full" size="lg" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Response
                </>
              )}
            </Button>
            {poll.isAnonymous && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Your response will be anonymous
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
