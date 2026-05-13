import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ArrowRight,
  Zap,
  Globe,
  CheckCircle,
  Users,
  TrendingUp,
  Clock,
  QrCode,
  ImageDown,
  UserCheck,
  Timer,
} from "lucide-react";

// ─── Live Poll Mock (unchanged) ───────────────────────────────────────────────

const MOCK_QUESTION = "What's slowing down your team the most right now?";
const MOCK_OPTIONS = [
  { label: "Too many meetings", color: "#0D9488", weight: 0.38 },
  { label: "Unclear requirements", color: "#14B8A6", weight: 0.29 },
  { label: "Tech debt backlog", color: "#5EEAD4", weight: 0.21 },
  { label: "Slow code reviews", color: "#2DD4BF", weight: 0.12 },
];
const RESTART_AT = 32;

function LivePollMock() {
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [total, setTotal] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [restarting, setRestarting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCycle = () => {
    let t = 0;
    const c = [0, 0, 0, 0];
    const tick = (delay: number) => {
      timeoutRef.current = setTimeout(() => {
        const r = Math.random();
        let cum = 0,
          chosen = 0;
        for (let i = 0; i < MOCK_OPTIONS.length; i++) {
          cum += MOCK_OPTIONS[i]!.weight;
          if (r < cum) {
            chosen = i;
            break;
          }
        }
        c[chosen] = (c[chosen] ?? 0) + 1;
        t++;
        setCounts([...c]);
        setTotal(t);
        setFlash(chosen);
        setTimeout(() => setFlash(null), 380);
        if (t < RESTART_AT) {
          tick(600);
        } else {
          setRestarting(true);
          timeoutRef.current = setTimeout(() => {
            setCounts([0, 0, 0, 0]);
            setTotal(0);
            setRestarting(false);
            runCycle();
          }, 1800);
        }
      }, delay);
    };
    tick(320);
  };

  useEffect(() => {
    runCycle();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      style={{
        background: "#111918",
        borderColor: "rgba(13,148,136,0.25)",
        boxShadow: "0 0 60px rgba(13,148,136,0.12), 0 25px 50px rgba(0,0,0,0.5)",
        opacity: restarting ? 0.4 : 1,
        transition: "opacity 0.5s",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#5EEAD4" }}>
          Engineering · Sprint retro
        </span>
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: "#F59E0B",
              boxShadow: "0 0 6px #F59E0B",
              animation: "livepulse 1.4s ease-in-out infinite",
            }}
          />
          LIVE
        </span>
      </div>
      <p className="mb-5 text-sm font-medium leading-snug" style={{ color: "#F0FDFA" }}>
        {MOCK_QUESTION}
      </p>
      <div className="space-y-3">
        {MOCK_OPTIONS.map((opt, i) => {
          const pct = total > 0 ? Math.round(((counts[i] ?? 0) / total) * 100) : 0;
          const isFlashing = flash === i;
          return (
            <div key={opt.label}>
              <div className="mb-1 flex justify-between text-xs" style={{ color: "#5EEAD4" }}>
                <span>{opt.label}</span>
                <span
                  style={{ color: isFlashing ? "#F59E0B" : "#5EEAD4", transition: "color 0.3s" }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: isFlashing
                      ? `linear-gradient(90deg, ${opt.color}, #F59E0B)`
                      : opt.color,
                    transition: "width 0.45s cubic-bezier(0.4,0,0.2,1), background 0.3s",
                    boxShadow: isFlashing ? `0 0 8px ${opt.color}` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="mt-5 flex items-center justify-between rounded-lg px-3 py-2"
        style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.15)" }}
      >
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "#5EEAD4" }}>
          <Users className="h-3 w-3" /> Responses collected
        </span>
        <span className="text-lg font-bold tabular-nums" style={{ color: "#0D9488" }}>
          {total}
        </span>
      </div>
    </div>
  );
}

// ─── App Mocks (unchanged) ────────────────────────────────────────────────────

function DashboardMock() {
  return (
    <div
      className="w-full overflow-hidden rounded-xl border shadow-xl"
      style={{ background: "#ffffff", borderColor: "rgba(13,148,136,0.2)" }}
    >
      <div
        className="flex items-center gap-1.5 border-b px-3 py-2.5"
        style={{ background: "#f8f9fa", borderColor: "#e5e7eb" }}
      >
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <div
          className="mx-3 flex-1 rounded px-2 py-0.5 text-xs text-gray-400"
          style={{ background: "#e5e7eb" }}
        >
          pollflow.tech/dashboard
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded" style={{ background: "#0D9488" }} />
            <span className="text-xs font-bold text-gray-800">PollFlow</span>
          </div>
          <div className="flex gap-3">
            <div className="h-2 w-12 rounded-full bg-gray-200" />
            <div className="h-2 w-12 rounded-full bg-gray-200" />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[
            ["3", "Active polls"],
            ["124", "Responses"],
            ["89%", "Completion"],
          ].map(([val, label]) => (
            <div key={label} className="rounded-lg border p-2.5" style={{ borderColor: "#e5e7eb" }}>
              <div className="text-sm font-bold text-gray-800">{val}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
        {[
          { title: "Sprint retro Q3", badge: "Active", color: "#0D9488", pct: 78 },
          { title: "Tool preference survey", badge: "Published", color: "#8B5CF6", pct: 100 },
        ].map((poll) => (
          <div
            key={poll.title}
            className="mb-2 flex items-center justify-between rounded-lg border p-2.5"
            style={{ borderColor: "#e5e7eb" }}
          >
            <div>
              <div className="text-xs font-medium text-gray-700">{poll.title}</div>
              <div className="mt-0.5 h-1 w-20 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${poll.pct}%`, background: poll.color }}
                />
              </div>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: `${poll.color}18`, color: poll.color }}
            >
              {poll.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsMock() {
  return (
    <div
      className="w-full overflow-hidden rounded-xl border shadow-xl"
      style={{ background: "#ffffff", borderColor: "rgba(13,148,136,0.2)" }}
    >
      <div
        className="flex items-center gap-1.5 border-b px-3 py-2.5"
        style={{ background: "#f8f9fa", borderColor: "#e5e7eb" }}
      >
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <div
          className="mx-3 flex-1 rounded px-2 py-0.5 text-xs text-gray-400"
          style={{ background: "#e5e7eb" }}
        >
          pollflow.tech/polls/abc123/analytics
        </div>
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-800">Sprint retro Q3</div>
            <div className="text-xs text-gray-400">42 responses · Live</div>
          </div>
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
            style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#F59E0B" }}
            />
            Live
          </div>
        </div>
        {[
          { label: "Too many meetings", pct: 38, color: "#0D9488" },
          { label: "Unclear requirements", pct: 29, color: "#14B8A6" },
          { label: "Tech debt backlog", pct: 21, color: "#5EEAD4" },
          { label: "Slow code reviews", pct: 12, color: "#2DD4BF" },
        ].map((opt) => (
          <div key={opt.label} className="mb-2">
            <div className="mb-0.5 flex justify-between text-xs text-gray-500">
              <span>{opt.label}</span>
              <span>{opt.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${opt.pct}%`, background: opt.color }}
              />
            </div>
          </div>
        ))}
        <div className="mt-3 rounded-lg p-2" style={{ background: "#f8f9fa" }}>
          <div className="mb-1.5 text-xs font-medium text-gray-500">Daily responses</div>
          <div className="flex items-end gap-1" style={{ height: 28 }}>
            {[4, 7, 5, 11, 8, 14, 9].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${(h / 14) * 100}%`,
                  background: i === 5 ? "#0D9488" : "#D1FAE5",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QRMock() {
  const cells: boolean[] = [];
  const seed = 42;
  for (let i = 0; i < 121; i++) {
    const x = i % 11,
      y = Math.floor(i / 11);
    const isCorner =
      (x < 3 && y < 3) ||
      (x > 7 && y < 3) ||
      (x < 3 && y > 7) ||
      (x === 3 && y < 3) ||
      (x < 3 && y === 3) ||
      (x === 8 && y < 3) ||
      (x > 7 && y === 3) ||
      (x === 3 && y > 7) ||
      (x < 3 && y === 8);
    cells.push(isCorner || (seed * (i + 7) * 13) % 3 === 0);
  }
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl p-6"
      style={{ background: "#111918", border: "1px solid rgba(13,148,136,0.2)" }}
    >
      <p className="text-xs font-medium" style={{ color: "#5EEAD4" }}>
        Scan to respond · no app needed
      </p>
      <div className="rounded-lg p-3" style={{ background: "#fff" }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(11, 10px)", gap: 1.5 }}>
          {cells.map((filled, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                background: filled ? "#0A0F0F" : "transparent",
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      </div>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
        style={{ background: "rgba(13,148,136,0.1)", color: "#0D9488" }}
      >
        <QrCode className="h-3.5 w-3.5" />
        pollflow.tech/polls/abc123/respond
      </div>
    </div>
  );
}

function ResultsCardMock() {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#0A0F0F",
        border: "1px solid rgba(13,148,136,0.25)",
        boxShadow: "0 0 30px rgba(13,148,136,0.08)",
        fontFamily: "Inter, sans-serif",
        maxWidth: 320,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded" style={{ background: "#0D9488" }} />
          <span className="text-xs font-semibold" style={{ color: "#5EEAD4" }}>
            PollFlow
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ background: "rgba(13,148,136,0.15)", color: "#0D9488" }}
        >
          Published Results
        </span>
      </div>
      <p className="mb-1 text-sm font-bold" style={{ color: "#F0FDFA" }}>
        Sprint Retro Q3
      </p>
      <p className="mb-3 text-xs" style={{ color: "#5EEAD4" }}>
        42 responses collected
      </p>
      <div className="mb-1 h-px" style={{ background: "rgba(13,148,136,0.15)" }} />
      <div className="mt-3 space-y-2">
        {[
          { label: "Too many meetings", pct: 38, winner: true },
          { label: "Unclear requirements", pct: 29, winner: false },
          { label: "Tech debt backlog", pct: 21, winner: false },
        ].map((opt) => (
          <div key={opt.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span
                style={{
                  color: opt.winner ? "#0D9488" : "#94A3B8",
                  fontWeight: opt.winner ? 600 : 400,
                }}
              >
                {opt.winner ? "↑ " : ""}
                {opt.label}
              </span>
              <span style={{ color: opt.winner ? "#0D9488" : "#5EEAD4" }}>{opt.pct}%</span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${opt.pct}%`,
                  background: opt.winner
                    ? "linear-gradient(90deg, #0D9488, #14B8A6)"
                    : "rgba(94,234,212,0.3)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs" style={{ color: "#334155" }}>
          pollflow.tech
        </span>
        <div
          className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium"
          style={{ background: "rgba(13,148,136,0.12)", color: "#0D9488" }}
        >
          <ImageDown className="h-3 w-3" /> Download PNG
        </div>
      </div>
    </div>
  );
}

function CountdownMock() {
  const [seconds, setSeconds] = useState(5 * 60 + 42);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s <= 0 ? 5 * 60 + 42 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds < 60;
  return (
    <div
      className="flex flex-col gap-4 rounded-xl p-5"
      style={{ background: "#111918", border: "1px solid rgba(13,148,136,0.2)" }}
    >
      <p className="text-xs font-medium" style={{ color: "#5EEAD4" }}>
        Respond before the poll closes
      </p>
      <div
        className="rounded-lg border px-3 py-2.5"
        style={{ background: "#ffffff", borderColor: "#e5e7eb" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">Team health check · Q4</span>
          <div
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: isUrgent ? "#EF4444" : "#6B7280" }}
          >
            {isUrgent ? <span className="text-red-400">⚠</span> : <span>⏱</span>}
            Closes in {mins}m {secs.toString().padStart(2, "0")}s
          </div>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: "60%", background: "#0D9488" }} />
        </div>
      </div>
      {isUrgent && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#F87171",
          }}
        >
          ⚠ Under 1 minute — submit before the poll closes
        </div>
      )}
      <p className="text-center text-xs" style={{ color: "rgba(94,234,212,0.4)" }}>
        Updates every second · turns red when urgent
      </p>
    </div>
  );
}

function IdentityMock() {
  const [state, setState] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const t = setInterval(() => setState((s) => ((s + 1) % 3) as 0 | 1 | 2), 2800);
    return () => clearInterval(t);
  }, []);
  const banners = [
    {
      icon: "🛡",
      color: "#0D9488",
      bg: "rgba(13,148,136,0.08)",
      border: "rgba(13,148,136,0.2)",
      title: "Anonymous poll",
      desc: "Your identity won't be stored, regardless of whether you're signed in.",
    },
    {
      icon: "✓",
      color: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.2)",
      title: "Responding as John Doe",
      desc: "john@example.com · Your response will be attributed to your account.",
    },
    {
      icon: "○",
      color: "#94A3B8",
      bg: "rgba(148,163,184,0.08)",
      border: "rgba(148,163,184,0.2)",
      title: "Responding anonymously",
      desc: "You're not signed in. Sign in instead if you want attribution.",
    },
  ];
  const b = banners[state]!;
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#111918", border: "1px solid rgba(13,148,136,0.2)" }}
    >
      <p className="mb-3 text-xs font-medium" style={{ color: "#5EEAD4" }}>
        Respondents always know who they're responding as
      </p>
      <div
        className="rounded-lg p-3"
        style={{ background: b.bg, border: `1px solid ${b.border}`, transition: "all 0.4s" }}
      >
        <p className="text-sm font-semibold" style={{ color: b.color }}>
          {b.icon} {b.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: "rgba(240,253,250,0.5)" }}>
          {b.desc}
        </p>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: state === i ? 16 : 6,
              height: 6,
              background: state === i ? "#0D9488" : "rgba(94,234,212,0.2)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Feature Showcase (tab hover fix applied) ─────────────────────────────────

const SHOWCASE_TABS = [
  {
    id: "live",
    icon: Zap,
    label: "Live results",
    heading: "Watch every vote land in real time",
    desc: "No page refresh. No polling the server. The moment a respondent submits, your analytics dashboard updates via WebSocket — bars shift, percentages change, totals increment.",
    component: LivePollMock,
  },
  {
    id: "qr",
    icon: QrCode,
    label: "QR sharing",
    heading: "Share via link or instant QR code",
    desc: "Every poll generates a downloadable QR code. Put it on a slide, a printed sheet, or a Slack message. Respondents scan and go directly to the poll — no app, no account needed.",
    component: QRMock,
  },
  {
    id: "card",
    icon: ImageDown,
    label: "Results card",
    heading: "Publish a shareable results image",
    desc: "Once you publish results, download a branded results card — dark teal, clean typography, winning option highlighted. Post it on LinkedIn, Slack, or Discord without exporting a spreadsheet.",
    component: ResultsCardMock,
  },
  {
    id: "countdown",
    icon: Timer,
    label: "Countdown",
    heading: "Live deadline countdown for respondents",
    desc: "Respondents see a live countdown to poll expiry. Under one hour it turns red with an urgency warning. When time runs out, the form closes — both server-side and client-side simultaneously.",
    component: CountdownMock,
  },
  {
    id: "identity",
    icon: UserCheck,
    label: "Identity indicator",
    heading: "Respondents always know who they are",
    desc: "Three clear states: anonymous poll (nobody is attributed), authenticated user (your name and email shown), or guest (not signed in, with an option to log in). No confusion about privacy.",
    component: IdentityMock,
  },
];

function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const ActiveComponent = SHOWCASE_TABS[active]!.component;
  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {SHOWCASE_TABS.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = active === i;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(i)}
              className="showcase-tab flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left"
              style={{
                background: isActive ? "rgba(13,148,136,0.12)" : "transparent",
                border: isActive
                  ? "1px solid rgba(13,148,136,0.35)"
                  : "1px solid rgba(13,148,136,0.08)",
                color: isActive ? "#F0FDFA" : "#5EEAD4",
                cursor: "pointer",
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? "#0D9488" : "#5EEAD4" }}
              />
              <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="min-h-[320px]">
        <h3 className="landing-heading mb-2 text-2xl" style={{ color: "#F0FDFA" }}>
          {SHOWCASE_TABS[active]!.heading}
        </h3>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "#5EEAD4", maxWidth: 460 }}>
          {SHOWCASE_TABS[active]!.desc}
        </p>
        <div style={{ animation: "fadein 0.3s ease both" }}>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

// ─── Marquee Strip (unchanged) ────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  { icon: "⚡", text: "Real-time WebSocket updates" },
  { icon: "🔒", text: "httpOnly cookie auth" },
  { icon: "📱", text: "QR code generation" },
  { icon: "🛡", text: "Anonymous responses" },
  { icon: "📊", text: "MongoDB aggregation pipeline" },
  { icon: "⏱", text: "Live countdown timer" },
  { icon: "🖼", text: "Shareable results card" },
  { icon: "✓", text: "Identity indicator" },
  { icon: "🔄", text: "Token refresh interceptor" },
  { icon: "📈", text: "Completion rate tracking" },
  { icon: "🔗", text: "One-click share link" },
  { icon: "🚀", text: "Duplicate polls instantly" },
];

function MarqueeStrip() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div
      className="overflow-hidden py-4"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div
        className="flex gap-4"
        style={{ animation: "marquee 28s linear infinite", width: "max-content" }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            style={{
              background: "rgba(13,148,136,0.08)",
              border: "1px solid rgba(13,148,136,0.15)",
              color: "#5EEAD4",
            }}
          >
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Create your poll",
    desc: "Add questions, mark required or optional, set expiry. Under 60 seconds.",
    visual: (
      <div
        className="rounded-lg p-3"
        style={{ background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}
      >
        <div className="mb-2 h-2 w-3/4 rounded-full bg-teal-900/40" />
        <div className="mb-2 flex gap-2">
          <div className="h-6 flex-1 rounded" style={{ background: "rgba(13,148,136,0.15)" }} />
          <div className="h-6 w-16 rounded" style={{ background: "rgba(245,158,11,0.15)" }} />
        </div>
        <div className="h-1.5 w-full rounded-full" style={{ background: "rgba(13,148,136,0.1)" }} />
      </div>
    ),
  },
  {
    num: "02",
    title: "Share via link or QR",
    desc: "Copy the URL or download a QR code. Respondents need no account to answer.",
    visual: (
      <div className="flex gap-2">
        <div
          className="flex flex-1 items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)" }}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "#0D9488" }} />
          <div
            className="h-1.5 flex-1 rounded-full"
            style={{ background: "rgba(94,234,212,0.2)" }}
          />
        </div>
        <div
          className="flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <QrCode className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
          <span className="text-xs" style={{ color: "#F59E0B" }}>
            QR
          </span>
        </div>
      </div>
    ),
  },
  {
    num: "03",
    title: "Watch it live",
    desc: "Your analytics dashboard updates in real time via WebSocket as responses come in.",
    visual: (
      <div
        className="rounded-lg p-2"
        style={{ background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}
      >
        <div className="flex items-end gap-1" style={{ height: 32 }}>
          {[30, 55, 45, 80, 65, 100, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${h}%`, background: i === 5 ? "#0D9488" : "rgba(13,148,136,0.25)" }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div
            className="h-1.5 w-16 rounded-full"
            style={{ background: "rgba(94,234,212,0.15)" }}
          />
          <div className="flex items-center gap-1 text-xs" style={{ color: "#F59E0B" }}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#F59E0B", animation: "livepulse 1.4s infinite" }}
            />
            Live
          </div>
        </div>
      </div>
    ),
  },
  {
    num: "04",
    title: "Publish & share the card",
    desc: "Close the poll, publish results, download a branded results card to share anywhere.",
    visual: (
      <div className="flex items-center gap-2">
        <div
          className="flex-1 rounded-lg p-2"
          style={{ background: "#0A0F0F", border: "1px solid rgba(13,148,136,0.25)" }}
        >
          <div
            className="mb-1.5 h-1.5 w-3/4 rounded-full"
            style={{ background: "rgba(13,148,136,0.4)" }}
          />
          {[38, 29, 21].map((w, i) => (
            <div key={i} className="mb-1 flex items-center gap-1.5">
              <div
                className="h-1 rounded-full"
                style={{ width: `${w}%`, background: i === 0 ? "#0D9488" : "rgba(94,234,212,0.2)" }}
              />
              <span style={{ fontSize: 9, color: "#5EEAD4" }}>{w}%</span>
            </div>
          ))}
        </div>
        <div
          className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-2"
          style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.2)" }}
        >
          <ImageDown className="h-4 w-4" style={{ color: "#0D9488" }} />
          <span style={{ fontSize: 9, color: "#0D9488" }}>PNG</span>
        </div>
      </div>
    ),
  },
];

const PAIN_POINTS = [
  "Sending a Google Form and waiting 3 days for results",
  "Manually exporting spreadsheets to see basic counts",
  "No idea if anyone has responded until you go check",
  "Sharing results means yet another email attachment",
];

// ─── 3 Testimonials ───────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      "Finally a polling tool where results update as students respond — without refreshing once. The countdown meant nobody submitted late.",
    name: "Secondary school teacher",
    detail: "34 responses collected live · classroom vote",
    initial: "A",
  },
  {
    quote:
      "We ran our sprint retro on a big screen and every vote shifted the bars in real time. The team actually stayed engaged for the whole session.",
    name: "Engineering lead",
    detail: "18-person team · Q3 retrospective",
    initial: "R",
  },
  {
    quote:
      "Shared the QR code on stage, collected 60 feedback responses during the closing talk, and published the card before people even left the room.",
    name: "Conference organiser",
    detail: "60 responses in 8 minutes · post-event feedback",
    initial: "S",
  },
];

const AUDIENCES = [
  {
    who: "Engineering teams",
    what: "Sprint retrospectives, tech stack decisions, team health checks — results visible to the whole room in real time.",
  },
  {
    who: "Teachers & educators",
    what: "Classroom votes, exit tickets, anonymous Q&A. Know what your students actually think, instantly.",
  },
  {
    who: "Event organisers",
    what: "Post-event feedback, session ratings, audience polls. Collect and publish results before the crowd leaves.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  // Scroll to features section from footer link
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing min-h-screen" style={{ background: "#0A0F0F", color: "#F0FDFA" }}>
      <style>{`
        @keyframes livepulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.8); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .au  { animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .d1  { animation-delay: 0.08s; }
        .d2  { animation-delay: 0.18s; }
        .d3  { animation-delay: 0.30s; }
        .d4  { animation-delay: 0.44s; }

        /* Scoped so Fraunces only applies inside the landing page, never bleeds into app */
        .landing .landing-heading { font-family: 'Fraunces', Georgia, serif; }

        .ctabtn { transition: opacity 0.15s, transform 0.15s; }
        .ctabtn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Feature tab hover — lights up inactive tabs on hover */
        .showcase-tab { transition: background 0.15s, border-color 0.15s, color 0.15s; }
        .showcase-tab:hover {
          background: rgba(13,148,136,0.07) !important;
          border-color: rgba(13,148,136,0.25) !important;
          color: #F0FDFA !important;
        }

        .noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.3;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="noise" />

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "#0D9488" }}
          >
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold" style={{ color: "#F0FDFA" }}>
            PollFlow
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/auth/login"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ color: "#5EEAD4" }}
          >
            Sign in
          </Link>
          <Link
            to="/auth/register"
            className="ctabtn rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "#0D9488", color: "#F0FDFA" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16">
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(13,148,136,0.07)",
            filter: "blur(100px)",
            top: -160,
            left: -160,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "rgba(245,158,11,0.05)",
            filter: "blur(80px)",
            top: 80,
            right: -80,
            pointerEvents: "none",
          }}
        />

        <div className="flex flex-col items-center gap-14 lg:flex-row lg:items-center">
          <div className="flex-1 text-center lg:text-left">
            <div
              className="au mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.25)",
                color: "#F59E0B",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "#F59E0B",
                  boxShadow: "0 0 6px #F59E0B",
                  animation: "livepulse 1.4s infinite",
                }}
              />
              Live analytics — updates as votes arrive
            </div>

            <h1
              className="landing-heading au d1 mb-5 text-5xl leading-[1.06] tracking-tight lg:text-6xl xl:text-7xl"
              style={{ color: "#F0FDFA" }}
            >
              See your poll results{" "}
              <em style={{ color: "#0D9488", fontStyle: "italic" }}>change in real time.</em>
            </h1>

            <p
              className="au d2 mb-8 max-w-lg text-lg leading-relaxed lg:text-xl"
              style={{ color: "#5EEAD4" }}
            >
              Create a poll in 60 seconds. Share via link or QR code. Watch results update live —
              then publish a shareable results card your team can actually keep.
            </p>

            <div className="au d3 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Link
                to="/auth/register"
                className="ctabtn flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold"
                style={{ background: "#0D9488", color: "#F0FDFA" }}
              >
                Create your first poll
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth/login"
                className="rounded-xl px-6 py-3.5 text-base font-medium"
                style={{ color: "#5EEAD4", border: "1px solid rgba(94,234,212,0.2)" }}
              >
                Sign in
              </Link>
            </div>

            <p className="au d4 mt-5 text-sm" style={{ color: "rgba(94,234,212,0.4)" }}>
              Free to use · Open source · Built for real teams
            </p>
          </div>

          <div className="au d2 flex flex-1 justify-center lg:justify-end">
            <LivePollMock />
          </div>
        </div>
      </section>

      {/* ── App preview ─────────────────────────────────────────────── */}
      <section
        className="relative z-10 py-24"
        style={{ borderTop: "1px solid rgba(13,148,136,0.1)" }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p
              className="mb-3 text-sm font-medium uppercase tracking-widest"
              style={{ color: "#0D9488" }}
            >
              Inside PollFlow
            </p>
            <h2
              className="landing-heading text-4xl tracking-tight lg:text-5xl"
              style={{ color: "#F0FDFA" }}
            >
              Built for clarity, not complexity.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base" style={{ color: "#5EEAD4" }}>
              A clean dashboard. A live analytics view. Both updating as votes come in.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ background: "rgba(13,148,136,0.15)" }}
                >
                  <Clock className="h-3.5 w-3.5" style={{ color: "#0D9488" }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "#F0FDFA" }}>
                  Your poll dashboard
                </span>
              </div>
              <DashboardMock />
              <p className="mt-3 text-sm" style={{ color: "rgba(94,234,212,0.5)" }}>
                All your polls at a glance — status, response count, share links, completion rate.
              </p>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ background: "rgba(245,158,11,0.15)" }}
                >
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "#F0FDFA" }}>
                  Live analytics view
                </span>
              </div>
              <AnalyticsMock />
              <p className="mt-3 text-sm" style={{ color: "rgba(94,234,212,0.5)" }}>
                Option breakdowns, daily timelines, anonymous vs identified — all live via
                WebSocket.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain points ─────────────────────────────────────────────── */}
      <section
        className="relative z-10 py-20"
        style={{
          borderTop: "1px solid rgba(13,148,136,0.1)",
          borderBottom: "1px solid rgba(13,148,136,0.1)",
        }}
      >
        <div className="mx-auto max-w-6xl px-6">
          {/* CHANGED: "Sound familiar?" → "Before PollFlow." */}
          <div className="mb-10 text-center">
            <h2
              className="landing-heading text-3xl tracking-tight lg:text-4xl"
              style={{ color: "#F0FDFA" }}
            >
              Before PollFlow.
            </h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(94,234,212,0.5)" }}>
              If any of these sound familiar, keep reading.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_POINTS.map((point, i) => (
              <div
                key={i}
                className="rounded-xl p-5"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="mb-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}
                >
                  ✕
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(240,253,250,0.6)" }}>
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marquee strip ───────────────────────────────────────────── */}
      <section
        className="relative z-10 py-10"
        style={{ borderBottom: "1px solid rgba(13,148,136,0.1)" }}
      >
        <MarqueeStrip />
      </section>

      {/* ── Testimonials — 3 cards ───────────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p
              className="mb-3 text-sm font-medium uppercase tracking-widest"
              style={{ color: "#0D9488" }}
            >
              What people say
            </p>
            <h2
              className="landing-heading text-4xl tracking-tight lg:text-5xl"
              style={{ color: "#F0FDFA" }}
            >
              Real polls. Real results.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-2xl p-7"
                style={{
                  background: "#111918",
                  border: "1px solid rgba(13,148,136,0.15)",
                  borderTop: "2px solid #0D9488",
                }}
              >
                {/* Quote marks */}
                <div
                  className="mb-4 text-3xl leading-none"
                  style={{ color: "#0D9488", fontFamily: "Georgia, serif" }}
                >
                  "
                </div>
                <p
                  className="flex-1 text-sm leading-relaxed"
                  style={{ color: "rgba(240,253,250,0.8)" }}
                >
                  {t.quote}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: "rgba(13,148,136,0.2)", color: "#0D9488" }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#F0FDFA" }}>
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: "#5EEAD4" }}>
                      {t.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section
        className="relative z-10 py-24"
        style={{ borderTop: "1px solid rgba(13,148,136,0.1)" }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p
              className="mb-3 text-sm font-medium uppercase tracking-widest"
              style={{ color: "#0D9488" }}
            >
              How it works
            </p>
            <h2
              className="landing-heading text-4xl tracking-tight lg:text-5xl"
              style={{ color: "#F0FDFA" }}
            >
              Four steps, two minutes.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex flex-col">
                <div
                  className="landing-heading mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold"
                  style={{
                    background: "rgba(13,148,136,0.12)",
                    border: "1px solid rgba(13,148,136,0.3)",
                    color: "#0D9488",
                  }}
                >
                  {step.num}
                </div>
                <h3 className="mb-1.5 text-base font-semibold" style={{ color: "#F0FDFA" }}>
                  {step.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed" style={{ color: "#5EEAD4" }}>
                  {step.desc}
                </p>
                {step.visual}
                {i < STEPS.length - 1 && (
                  <div
                    className="mt-4 hidden h-px lg:block"
                    style={{ background: "rgba(13,148,136,0.1)" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature showcase — id="features" for footer link ────────── */}
      <section
        id="features"
        className="relative z-10 py-24"
        style={{ borderTop: "1px solid rgba(13,148,136,0.1)" }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p
              className="mb-3 text-sm font-medium uppercase tracking-widest"
              style={{ color: "#0D9488" }}
            >
              Features
            </p>
            <h2
              className="landing-heading text-4xl tracking-tight lg:text-5xl"
              style={{ color: "#F0FDFA" }}
            >
              Everything you actually need.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base" style={{ color: "#5EEAD4" }}>
              Click through to see each feature in action.
            </p>
          </div>
          <FeatureShowcase />
        </div>
      </section>

      {/* ── Audiences ───────────────────────────────────────────────── */}
      <section
        className="relative z-10 py-24"
        style={{ borderTop: "1px solid rgba(13,148,136,0.1)" }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2
              className="landing-heading text-4xl tracking-tight lg:text-5xl"
              style={{ color: "#F0FDFA" }}
            >
              Who uses PollFlow?
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div
                key={a.who}
                className="rounded-2xl p-6"
                style={{
                  background: "rgba(13,148,136,0.06)",
                  border: "1px solid rgba(13,148,136,0.15)",
                }}
              >
                <p className="mb-2 font-semibold" style={{ color: "#0D9488" }}>
                  {a.who}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#5EEAD4" }}>
                  {a.what}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="relative overflow-hidden rounded-3xl p-12 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(13,148,136,0.18) 0%, rgba(13,148,136,0.04) 100%)",
              border: "1px solid rgba(13,148,136,0.28)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 400,
                height: 400,
                borderRadius: "50%",
                background: "rgba(13,148,136,0.08)",
                filter: "blur(80px)",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                pointerEvents: "none",
              }}
            />
            <div className="relative">
              <h2
                className="landing-heading mb-4 text-4xl tracking-tight lg:text-5xl"
                style={{ color: "#F0FDFA" }}
              >
                Ready to run your first poll?
              </h2>
              <p className="mx-auto mb-8 max-w-md text-lg" style={{ color: "#5EEAD4" }}>
                Free to use. Your first live results in under two minutes.
              </p>
              <Link
                to="/auth/register"
                className="ctabtn inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold"
                style={{ background: "#0D9488", color: "#F0FDFA" }}
              >
                Create your first poll
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                {[
                  "QR code sharing",
                  "Live WebSocket updates",
                  "Shareable results card",
                  "Anonymous responses",
                ].map((t) => (
                  <div
                    key={t}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "rgba(94,234,212,0.55)" }}
                  >
                    <CheckCircle className="h-4 w-4" style={{ color: "#0D9488" }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 py-10"
        style={{ borderTop: "1px solid rgba(13,148,136,0.1)" }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: "#0D9488" }} />
              <span className="text-sm font-semibold" style={{ color: "#5EEAD4" }}>
                PollFlow
              </span>
              <span className="text-xs" style={{ color: "rgba(94,234,212,0.3)" }}>
                · Real-time polls, live results
              </span>
            </div>
            <div
              className="flex items-center gap-6 text-xs"
              style={{ color: "rgba(94,234,212,0.5)" }}
            >
              {/* FIXED: now correctly scrolls to #features */}
              <button onClick={scrollToFeatures} className="transition-colors hover:text-teal-300">
                Features
              </button>
              <Link to="/auth/register" className="transition-colors hover:text-teal-300">
                Get started
              </Link>
              <Link to="/auth/login" className="transition-colors hover:text-teal-300">
                Sign in
              </Link>
              <a
                href="https://github.com/your-username/pollflow"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-teal-300"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-6 text-center text-xs" style={{ color: "rgba(94,234,212,0.2)" }}>
            Copyrights Reserved · 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
