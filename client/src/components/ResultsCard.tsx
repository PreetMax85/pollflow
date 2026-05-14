import { forwardRef } from "react";
import type { QuestionAnalytics } from "@/types";

interface CardData {
  pollTitle: string;
  totalResponses: number;
  questions: QuestionAnalytics[];
  publishedAt?: string | undefined;
}

interface ResultsCardProps {
  data: CardData;
}

export const ResultsCard = forwardRef<HTMLDivElement, ResultsCardProps>(({ data }, ref) => {
  const { pollTitle, totalResponses, questions, publishedAt } = data;

  const displayQuestions = questions.slice(0, 4);

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      ref={ref}
      style={{
        width: 600,
        background: "#0A0F0F",
        color: "#F0FDFA",
        padding: "40px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        borderRadius: 16,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "#0D9488",
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <span style={{ color: "#5EEAD4", fontSize: 13, fontWeight: 600, paddingBottom: "14px" }}>PollFlow</span>
        </div>

        <div
          style={{
            background: "rgba(13,148,136,0.15)",
            border: "1px solid rgba(13,148,136,0.3)",
            borderRadius: 20,
            height: 26,
            padding: "0 12px",
            paddingBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#0D9488",
            fontWeight: 500,
            letterSpacing: "0.03em",
            textTransform: "uppercase" as const,
            lineHeight: 1,
            whiteSpace: "nowrap" as const,
          }}
        >
          Published Results
        </div>
      </div>

      {/* Title */}
      <h2
        style={{
          color: "#F0FDFA",
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.25,
          marginBottom: 6,
          letterSpacing: "-0.02em",
        }}
      >
        {pollTitle}
      </h2>

      {/* Count */}
      <p style={{ color: "#5EEAD4", fontSize: 13, marginBottom: 28 }}>
        {totalResponses} response{totalResponses !== 1 ? "s" : ""} collected
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(13,148,136,0.15)", marginBottom: 24 }} />

      {/* Questions */}
      {displayQuestions.map((question, qIndex) => {
        const topOption = question.options.reduce<QuestionAnalytics["options"][number] | null>(
          (top, opt) => (top === null || opt.count > top.count ? opt : top),
          null,
        );

        return (
          <div
            key={question.questionId}
            style={{ marginBottom: qIndex < displayQuestions.length - 1 ? 24 : 0 }}
          >
            <p
              style={{
                color: "#94A3B8",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase" as const,
                marginBottom: 6,
              }}
            >
              Question {qIndex + 1}
            </p>
            <p
              style={{
                color: "#F0FDFA",
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              {question.questionText}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...question.options]
                .sort((a, b) => b.count - a.count)
                .slice(0, 4)
                .map((option) => {
                  const isWinner =
                    topOption !== null &&
                    option.optionId === topOption.optionId &&
                    question.totalAnswers > 0;

                  const barWidth = Math.max(option.percentage, 1.5);

                  return (
                    <div key={option.optionId}>
                      <div
                        style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: isWinner ? "#0D9488" : "#94A3B8",
                            fontWeight: isWinner ? 600 : 400,
                            flexGrow: 1,
                            lineHeight: 1.4,
                            wordBreak: "break-word" as const,
                          }}
                        >
                          {isWinner ? "★ " : ""}
                          {option.optionText}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: isWinner ? "#0D9488" : "#5EEAD4",
                            fontWeight: isWinner ? 700 : 400,
                            flexShrink: 0,
                            minWidth: 44,
                            textAlign: "right" as const,
                          }}
                        >
                          {option.percentage}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div
                        style={{
                          height: 6,
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${barWidth}%`,
                            background: isWinner ? "#0D9488" : "rgba(94,234,212,0.3)",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}

      {/* Overflow note */}
      {questions.length > 4 && (
        <p style={{ color: "#475569", fontSize: 11, marginTop: 16, textAlign: "center" as const }}>
          +{questions.length - 4} more question{questions.length - 4 !== 1 ? "s" : ""} — view full
          results at pollflow.jdevs.codes
        </p>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid rgba(13,148,136,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#334155", fontSize: 11 }}>pollflow.jdevs.codes</span>
        <span style={{ color: "#334155", fontSize: 11 }}>Results published · {formattedDate}</span>
      </div>
    </div>
  );
});

ResultsCard.displayName = "ResultsCard";
