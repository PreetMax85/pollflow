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

/**
 * Off-screen rendered component — captured by html2canvas.
 * Must use ONLY inline styles. CSS variables and Tailwind
 * utility classes that reference var(--...) won't render correctly
 * in html2canvas because it doesn't evaluate CSS custom properties.
 *
 * Fixed width: 600px — standard OG card width, looks good everywhere.
 */
export const ResultsCard = forwardRef<HTMLDivElement, ResultsCardProps>(({ data }, ref) => {
  const { pollTitle, totalResponses, questions, publishedAt } = data;

  // Only show top 4 questions max — card gets too tall otherwise
  const displayQuestions = questions.slice(0, 4);

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
        // Needed so html2canvas captures rounded corners correctly
        overflow: "hidden",
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
            }}
          >
            {/* SVG bar chart icon — Lucide won't render in html2canvas */}
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
          <span style={{ color: "#5EEAD4", fontSize: 13, fontWeight: 600 }}>PollFlow</span>
        </div>
        <div
          style={{
            background: "rgba(13,148,136,0.15)",
            border: "1px solid rgba(13,148,136,0.3)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            color: "#0D9488",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Published Results
        </div>
      </div>

      {/* Poll title */}
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

      {/* Total responses */}
      <p style={{ color: "#5EEAD4", fontSize: 13, marginBottom: 28 }}>
        {totalResponses} response{totalResponses !== 1 ? "s" : ""} collected
      </p>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(13,148,136,0.15)",
          marginBottom: 24,
        }}
      />

      {/* Questions */}
      {displayQuestions.map((question, qIndex) => {
        const topOption = question.options.reduce(
          (top, opt) => (opt.count > (top?.count ?? -1) ? opt : top),
          question.options[0],
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
                textTransform: "uppercase",
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

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...question.options]
                .sort((a, b) => b.count - a.count)
                .slice(0, 4) // max 4 options per question on the card
                .map((option) => {
                  const isWinner =
                    option.optionId === topOption?.optionId && question.totalAnswers > 0;

                  return (
                    <div key={option.optionId}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: isWinner ? "#0D9488" : "#94A3B8",
                            fontWeight: isWinner ? 600 : 400,
                            maxWidth: 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isWinner ? "↑ " : ""}
                          {option.optionText}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: isWinner ? "#0D9488" : "#5EEAD4",
                            fontWeight: isWinner ? 700 : 400,
                            flexShrink: 0,
                            marginLeft: 8,
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
                            width: `${option.percentage}%`,
                            background: isWinner
                              ? "linear-gradient(90deg, #0D9488, #14B8A6)"
                              : "rgba(94,234,212,0.3)",
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

      {/* If more than 4 questions, note it */}
      {questions.length > 4 && (
        <p
          style={{
            color: "#475569",
            fontSize: 11,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          + {questions.length - 4} more question{questions.length - 4 !== 1 ? "s" : ""} — view full
          results at pollflow.tech
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
        <span style={{ color: "#334155", fontSize: 11 }}>pollflow.tech</span>
        <span style={{ color: "#334155", fontSize: 11 }}>
          Results published ·{" "}
          {publishedAt
            ? new Date(publishedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : new Date().toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
        </span>
      </div>
    </div>
  );
});

ResultsCard.displayName = "ResultsCard";
