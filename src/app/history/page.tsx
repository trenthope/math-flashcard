'use client';

import { useMemo, useState } from 'react';
import { useCurrentUserSessions, useHistoryStore } from '@/store/historyStore';
import { useUserStore } from '@/store/userStore';
import { localDateKey, useCurrentUserPracticeTime } from '@/store/practiceTimeStore';
import { GameMode, Operation, SessionRecord } from '@/types';
import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────

const OP_LABELS: Record<Operation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
};

const OP_SYMBOLS: Record<Operation, string> = {
  addition: '+',
  subtraction: '-',
  multiplication: '\u00d7',
  division: '\u00f7',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtDuration(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return `${Math.floor(ms / 1000)}s`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Chart Data ───────────────────────────────────────────────

type Metric = { value: (s: SessionRecord) => number; decimals: number };
type ChartRow = { date: string; sessions: number } & Record<string, number | string>;

// Flashcard sessions have no time limit, so speed uses the session's length
const FLASHCARD_METRICS: Record<string, Metric> = {
  accuracy: { value: (s) => s.accuracy * 100, decimals: 0 },
  correctPerMin: {
    value: (s) => (s.totalTime > 0 ? s.cardsCorrect / (s.totalTime / 60000) : 0),
    decimals: 1,
  },
};

const MATH_MINUTE_METRICS: Record<string, Metric> = {
  accuracy: { value: (s) => s.accuracy * 100, decimals: 0 },
  correctPerMin: {
    value: (s) => (s.timeLimit > 0 ? (s.cardsCorrect / s.timeLimit) * 60 : 0),
    decimals: 1,
  },
};

function round(value: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** One chart row per session. Expects sessions sorted oldest first. */
function sessionRows(sessions: SessionRecord[], metrics: Record<string, Metric>): ChartRow[] {
  return sessions.map((s) => {
    const row: ChartRow = { date: fmtDate(s.createdAt), sessions: 1 };
    for (const [key, m] of Object.entries(metrics)) row[key] = round(m.value(s), m.decimals);
    return row;
  });
}

/** One chart row per local calendar day, averaging each metric across that
 *  day's sessions. Expects sessions sorted oldest first. */
function dailyRows(sessions: SessionRecord[], metrics: Record<string, Metric>): ChartRow[] {
  const byDay = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const day = localDateKey(new Date(s.createdAt));
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  return [...byDay.values()].map((daySessions) => {
    const row: ChartRow = { date: fmtDate(daySessions[0].createdAt), sessions: daySessions.length };
    for (const [key, m] of Object.entries(metrics)) {
      const total = daySessions.reduce((sum, s) => sum + m.value(s), 0);
      row[key] = round(total / daySessions.length, m.decimals);
    }
    return row;
  });
}

// ── Component ────────────────────────────────────────────────

export default function HistoryPage() {
  const sessions = useCurrentUserSessions();
  const practiceTime = useCurrentUserPracticeTime();
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const { users, currentUserId } = useUserStore();
  const currentUser = users.find((u) => u.id === currentUserId);

  const [modeFilter, setModeFilter] = useState<'all' | GameMode>('all');
  const [opFilter, setOpFilter] = useState<'all' | Operation>('all');
  const [focusFilter, setFocusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'7' | '30' | 'all'>('all');
  const [sortNewest, setSortNewest] = useState(true);

  const focusNumbers = useMemo(
    () =>
      Array.from(new Set(sessions.flatMap((s) => s.focusNumbers))).sort(
        (a, b) => a - b,
      ),
    [sessions],
  );

  const filtered = useMemo(() => {
    let list = sessions;
    if (modeFilter !== 'all')
      list = list.filter((s) => s.mode === modeFilter);
    if (opFilter !== 'all')
      list = list.filter((s) => s.operations.includes(opFilter));
    if (focusFilter !== 'all')
      list = list.filter((s) => s.focusNumbers.includes(Number(focusFilter)));
    if (dateFilter !== 'all') {
      const cutoff = daysAgo(Number(dateFilter));
      list = list.filter((s) => new Date(s.createdAt) >= cutoff);
    }
    return list;
  }, [sessions, modeFilter, opFilter, focusFilter, dateFilter]);

  const flashcardSessions = useMemo(
    () => [...filtered].filter((s) => s.mode === 'flashcard').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [filtered],
  );

  const mathMinuteSessions = useMemo(
    () => [...filtered].filter((s) => s.mode === 'mathminute').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [filtered],
  );

  const flashcardChartData = sessionRows(flashcardSessions, FLASHCARD_METRICS);
  const flashcardDailyData = dailyRows(flashcardSessions, FLASHCARD_METRICS);
  const mathMinuteChartData = sessionRows(mathMinuteSessions, MATH_MINUTE_METRICS);
  const mathMinuteDailyData = dailyRows(mathMinuteSessions, MATH_MINUTE_METRICS);

  const sortedFiltered = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortNewest ? -diff : diff;
      }),
    [filtered, sortNewest],
  );

  const today = localDateKey();
  const weekStart = localDateKey(daysAgo(6));
  const mathTime = Object.entries(practiceTime).reduce(
    (acc, [day, ms]) => {
      if (day === today) acc.today += ms;
      if (day >= weekStart) acc.week += ms;
      acc.all += ms;
      return acc;
    },
    { today: 0, week: 0, all: 0 },
  );

  const tooltipStyle = {
    backgroundColor: '#FFFFFF',
    border: '2px solid #E5E7EB',
    borderRadius: '16px',
    color: '#374151',
    fontFamily: "'Fredoka', sans-serif",
    fontWeight: 600,
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          {currentUser ? `${currentUser.name}\u2019s History` : 'Session History'}
        </h1>

        {/* ── Math Time ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Math Time Today', value: mathTime.today, cls: 'bg-blue-100 border-blue-200 text-blue-600' },
            { label: 'Last 7 Days', value: mathTime.week, cls: 'bg-purple-100 border-purple-200 text-purple-600' },
            { label: 'All Time', value: mathTime.all, cls: 'bg-orange-100 border-orange-200 text-orange-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`${cls} border-2 rounded-2xl p-4 text-center`}>
              <div className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {fmtDuration(value)}
              </div>
              <div className="text-xs md:text-sm mt-1 font-bold">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ──────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 p-4 shadow-md">
          <div className="flex flex-wrap gap-3 items-end">
            <PillSelect
              label="Mode"
              value={modeFilter}
              onChange={(v) => setModeFilter(v as typeof modeFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'flashcard', label: 'Flashcard' },
                { value: 'mathminute', label: 'Math Minute' },
              ]}
            />
            <PillSelect
              label="Operation"
              value={opFilter}
              onChange={(v) => setOpFilter(v as typeof opFilter)}
              options={[
                { value: 'all', label: 'All' },
                ...(['addition', 'subtraction', 'multiplication', 'division'] as const).map(
                  (op) => ({ value: op, label: OP_LABELS[op] }),
                ),
              ]}
            />
            <PillSelect
              label="Focus"
              value={focusFilter}
              onChange={setFocusFilter}
              options={[
                { value: 'all', label: 'All' },
                ...focusNumbers.map((n) => ({ value: String(n), label: String(n) })),
              ]}
            />
            <PillSelect
              label="Period"
              value={dateFilter}
              onChange={(v) => setDateFilter(v as typeof dateFilter)}
              options={[
                { value: '7', label: '7 days' },
                { value: '30', label: '30 days' },
                { value: 'all', label: 'All time' },
              ]}
            />
          </div>
        </div>

        {/* ── Flashcard Charts ─────────────────────────────────── */}
        {(modeFilter === 'all' || modeFilter === 'flashcard') && (
          <>
            {flashcardChartData.length >= 2 && (
              <ChartSection
                title="Flashcard Progress 📈"
                data={flashcardChartData}
                charts={PROGRESS_CHARTS}
                tooltipStyle={tooltipStyle}
              />
            )}
            {flashcardDailyData.length >= 2 && (
              <ChartSection
                title="Flashcard Daily Averages 📅"
                data={flashcardDailyData}
                charts={PROGRESS_CHARTS}
                tooltipStyle={tooltipStyle}
                daily
              />
            )}
          </>
        )}

        {/* ── Math Minute Charts ──────────────────────────────── */}
        {(modeFilter === 'all' || modeFilter === 'mathminute') && (
          <>
            {mathMinuteChartData.length >= 2 && (
              <ChartSection
                title="Math Minute Progress ⏱️"
                data={mathMinuteChartData}
                charts={PROGRESS_CHARTS}
                tooltipStyle={tooltipStyle}
              />
            )}
            {mathMinuteDailyData.length >= 2 && (
              <ChartSection
                title="Math Minute Daily Averages 📅"
                data={mathMinuteDailyData}
                charts={PROGRESS_CHARTS}
                tooltipStyle={tooltipStyle}
                daily
              />
            )}
          </>
        )}

        {/* ── Session Table ────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-md">
          {sortedFiltered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-5xl mb-3">&#x1F4DA;</p>
              <p className="text-xl font-bold text-gray-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>No sessions yet</p>
              <p className="text-sm mt-1 text-gray-400 font-semibold">
                Complete a practice session to see your history here!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-bold">
                      <button
                        onClick={() => setSortNewest((p) => !p)}
                        className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                        style={{ fontFamily: "'Fredoka', sans-serif" }}
                      >
                        Date {sortNewest ? '\u2193' : '\u2191'}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Mode</th>
                    <th className="px-4 py-3 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Ops</th>
                    <th className="px-4 py-3 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Focus</th>
                    <th className="px-4 py-3 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Range</th>
                    <th className="px-4 py-3 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Accuracy</th>
                    <th className="px-4 py-3 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Speed</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map((s) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Clear History ─────────────────────────────────────── */}
        {sessions.length > 0 && (
          <div className="text-center">
            <button
              onClick={() => {
                if (window.confirm('Clear all session history? This cannot be undone.')) {
                  clearHistory();
                }
              }}
              className="text-sm text-gray-400 hover:text-red-500 font-semibold transition-colors"
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Charts ───────────────────────────────────────────────────

type ChartSpec = {
  title: string;
  dataKey: string;
  name: string;
  kind: 'line' | 'bar';
  color: string;
  unit: '%' | '/min';
};

// Both modes chart the same two metrics
const PROGRESS_CHARTS: ChartSpec[] = [
  { title: 'Speed (correct per minute)', dataKey: 'correctPerMin', name: 'Correct', kind: 'bar', color: '#3B82F6', unit: '/min' },
  { title: 'Accuracy', dataKey: 'accuracy', name: 'Accuracy', kind: 'line', color: '#22C55E', unit: '%' },
];

function ChartSection({
  title,
  data,
  charts,
  tooltipStyle,
  daily = false,
}: {
  title: string;
  data: ChartRow[];
  charts: ChartSpec[];
  tooltipStyle: React.CSSProperties;
  daily?: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl border-2 border-gray-200 p-6 shadow-md">
      <h2 className="text-xl font-bold text-gray-700 mb-4" style={{ fontFamily: "'Fredoka', sans-serif" }}>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((c) => {
          const children = [
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#E5E7EB" />,
            <XAxis key="x" dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} />,
            <YAxis
              key="y"
              domain={c.unit === '%' ? [0, 100] : undefined}
              allowDecimals={c.unit !== '/min'}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              tickFormatter={c.unit === '/min' ? undefined : (v: number) => `${v}${c.unit}`}
            />,
            <Tooltip
              key="tip"
              formatter={(value) => `${value}${c.unit}`}
              // Daily tooltips show how many sessions went into each average
              labelFormatter={
                daily
                  ? (label, payload) => {
                      const n = (payload?.[0]?.payload as ChartRow | undefined)?.sessions ?? 0;
                      return `${label} · ${n} session${n === 1 ? '' : 's'}`;
                    }
                  : undefined
              }
              contentStyle={tooltipStyle}
            />,
          ];
          return (
            <div key={c.dataKey}>
              <h3 className="text-sm font-bold text-gray-400 mb-2">
                {daily ? `${c.title} — daily avg` : c.title}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                {c.kind === 'bar' ? (
                  <ComposedChart data={data}>
                    {children}
                    <Bar dataKey={c.dataKey} name={c.name} fill={c.color} radius={[8, 8, 0, 0]} />
                  </ComposedChart>
                ) : (
                  <LineChart data={data}>
                    {children}
                    <Line type="monotone" dataKey={c.dataKey} name={c.name} stroke={c.color} strokeWidth={3} dot={{ r: 5, fill: c.color }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function PillSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: "'Fredoka', sans-serif" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block bg-gray-50 border-2 border-gray-200 text-gray-600 text-sm font-bold rounded-full px-4 py-2 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
        style={{ fontFamily: "'Fredoka', sans-serif" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SessionRow({ session: s }: { session: SessionRecord }) {
  const deleteSession = useHistoryStore((st) => st.deleteSession);
  const isFlashcard = s.mode === 'flashcard';
  const accPct = Math.round(s.accuracy * 100);

  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors group">
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-semibold">
        {fmtDateTime(s.createdAt)}
      </td>
      <td className="px-4 py-3 text-gray-500 font-semibold">
        {isFlashcard ? 'Flashcard' : 'Math Minute'}
      </td>
      <td className="px-4 py-3 text-gray-500 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
        {s.operations.map((op) => OP_SYMBOLS[op]).join(', ')}
      </td>
      <td className="px-4 py-3 text-gray-500 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>{s.focusNumbers.join(', ')}</td>
      <td className="px-4 py-3 text-gray-500 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
        {s.rangeMin}–{s.rangeMax}
      </td>
      <td className="px-4 py-3">
        <span
          className={`font-bold ${
            accPct >= 90
              ? 'text-green-600'
              : accPct >= 70
                ? 'text-yellow-600'
                : 'text-red-500'
          }`}
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          {accPct}%
        </span>
        <span className="text-gray-400 ml-1 text-xs font-semibold">
          ({s.cardsCorrect}/{s.cardsAttempted})
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 font-bold whitespace-nowrap" style={{ fontFamily: "'Fredoka', sans-serif" }}>
        {`${(s.avgTimePerCard / 1000).toFixed(1)}s avg`}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => deleteSession(s.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all font-bold text-lg leading-none"
          title="Delete session"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
