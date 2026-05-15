import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, ArrowLeft, Globe, ImageDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { ResultsCard } from "@/components/ResultsCard";
import { useResultsCardExport } from "@/hooks/useResultsCardExport";
import { analyticsApi } from "@/api/polls";
import type { QuestionAnalytics, PublishedResults, ApiResponse } from "@/types";

// Question result card

function QuestionResultCard({ question, index }: { question: QuestionAnalytics; index: number }) {
  const sorted = [...question.options].sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-snug">
            {index + 1}. {question.questionText}
          </CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {question.totalAnswers} answer{question.totalAnswers !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {sorted.map((option) => (
          <div key={option.optionId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{option.optionText}</span>
              <span className="text-muted-foreground tabular-nums">
                {option.count} ({option.percentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={option.percentage} className="h-2" />
          </div>
        ))}

        {question.totalAnswers === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">No answers recorded</p>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Page

export default function PollResultsPage() {
  const { pollId } = useParams<{ pollId: string }>();

  const { data, isLoading, isError } = useQuery<ApiResponse<PublishedResults>, Error>({
    queryKey: ["analytics", pollId, "results"],
    queryFn: () => analyticsApi.getPublishedResults(pollId!),
    enabled: !!pollId,
    retry: false,
  });

  const analytics = data?.data;

  const { cardRef, exportCard, isExporting } = useResultsCardExport(analytics?.pollTitle ?? "");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <Link to="/" className="font-semibold">
            PollFlow
          </Link>
          <Badge variant="secondary" className="flex items-center gap-1 ml-auto">
            <Globe className="h-3 w-3" />
            Published results
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Loading */}
        {isLoading && <ResultsSkeleton />}

        {/* Error — poll not published or not found */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="landing-heading text-lg">Results not available</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              These results haven&apos;t been published yet, or the poll doesn&apos;t exist.
            </p>
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go home
              </Link>
            </Button>
          </div>
        )}

        {/* Results */}
        {analytics && (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  <span className="font-medium text-foreground">{analytics.totalResponses}</span>{" "}
                  total response{analytics.totalResponses !== 1 ? "s" : ""}
                </span>
              </div>
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
                    Download results card
                  </>
                )}
              </Button>
            </div>

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

            {analytics.totalResponses === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Users className="h-10 w-10 text-muted-foreground" />
                <h3 className="font-medium">No responses yet</h3>
                <p className="text-sm text-muted-foreground">
                  Share the poll link to start collecting responses.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.questions.map((q, i) => (
                  <QuestionResultCard key={q.questionId} question={q} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
