import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  CalendarDays,
  Download,
  FileJson,
  Github,
  RotateCcw,
  Save,
  Target,
  Upload
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./style.css";

type ValueType = "check" | "number" | "money" | "rating" | "text";

type Task = {
  id: string;
  section: string;
  group: string;
  label: string;
  type: ValueType;
  unit?: string;
  target?: number;
};

type DayEntry = {
  date: string;
  values: Record<string, string | number | boolean>;
};

type EntryStore = {
  version: 1;
  entries: Record<string, DayEntry>;
};

type ViewMode = "daily" | "weekly" | "monthly";

const STORAGE_KEY = "dashboard-real:v1";
const START_DATE = "2026-05-01";
const ONE_DAY = 24 * 60 * 60 * 1000;
const MONEY = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "INR"
});

const tasks: Task[] = [
  { id: "brush_floss", section: "Basic Hygiene", group: "Face", label: "Brush and Floss", type: "check" },
  { id: "facial_hair", section: "Basic Hygiene", group: "Face", label: "Facial Hair", type: "check" },
  { id: "contacts", section: "Basic Hygiene", group: "Face", label: "Contacts", type: "check" },
  { id: "skin_care", section: "Basic Hygiene", group: "Face", label: "Skin Care", type: "check" },
  { id: "body_hair", section: "Basic Hygiene", group: "Body", label: "Body Hair", type: "check" },
  { id: "fingernails", section: "Basic Hygiene", group: "Body", label: "Fingernails", type: "check" },
  { id: "perfume", section: "Basic Hygiene", group: "Body", label: "Perfume", type: "check" },
  { id: "hair", section: "Basic Hygiene", group: "Body", label: "Hair", type: "check" },
  { id: "bench", section: "Fitness", group: "Lifts", label: "Bench", type: "number", unit: "kg" },
  { id: "deadlift", section: "Fitness", group: "Lifts", label: "Deadlift", type: "number", unit: "kg" },
  { id: "squat", section: "Fitness", group: "Lifts", label: "Squat", type: "number", unit: "kg" },
  { id: "lat", section: "Fitness", group: "Lifts", label: "Lat", type: "number", unit: "kg" },
  { id: "bicep", section: "Fitness", group: "Lifts", label: "Bicep", type: "number", unit: "kg" },
  { id: "tricep", section: "Fitness", group: "Lifts", label: "Tricep", type: "number", unit: "kg" },
  { id: "run_5k", section: "Fitness", group: "Runs", label: "5k", type: "check" },
  { id: "run_10k", section: "Fitness", group: "Runs", label: "10k", type: "check" },
  { id: "run_other", section: "Fitness", group: "Runs", label: "Other Run", type: "number", unit: "km" },
  { id: "eggs", section: "Nutrition", group: "Protein", label: "Eggs", type: "number", unit: "count", target: 2 },
  { id: "milk", section: "Nutrition", group: "Protein", label: "Milk", type: "number", unit: "glasses", target: 1 },
  { id: "chappatti", section: "Nutrition", group: "Protein", label: "Chappatti", type: "number", unit: "count", target: 2 },
  { id: "paneer", section: "Nutrition", group: "Protein", label: "Paneer", type: "number", unit: "g", target: 100 },
  { id: "whey", section: "Nutrition", group: "Protein", label: "Whey", type: "number", unit: "scoops", target: 1 },
  { id: "supplement_shake", section: "Nutrition", group: "Protein", label: "Supplement Shake", type: "check" },
  { id: "fibre_fruits", section: "Nutrition", group: "Fibre", label: "Fibre and Fruits", type: "check" },
  { id: "b12", section: "Recovery", group: "Supplement", label: "B12", type: "check" },
  { id: "doxycycline", section: "Recovery", group: "Supplement", label: "Doxycycline", type: "check" },
  { id: "creatine", section: "Recovery", group: "Supplement", label: "Creatine", type: "check" },
  { id: "spend_protein", section: "Expenditure", group: "Actual Spend", label: "Protein", type: "money" },
  { id: "spend_fibre", section: "Expenditure", group: "Actual Spend", label: "Fibre", type: "money" },
  { id: "spend_supplements", section: "Expenditure", group: "Actual Spend", label: "Supplements", type: "money" },
  { id: "spend_body_care", section: "Expenditure", group: "Actual Spend", label: "Body Care Products", type: "money" },
  { id: "spend_others", section: "Expenditure", group: "Actual Spend", label: "Others", type: "money" },
  { id: "daily_happiness", section: "Mindset", group: "Mood", label: "Daily Happiness", type: "rating", target: 8 },
  { id: "daily_satisfaction", section: "Mindset", group: "Mood", label: "Daily Satisfaction", type: "rating", target: 8 },
  { id: "scenario_plan", section: "Mindset", group: "Planning", label: "Scenario Planning", type: "text" },
  { id: "thoughts_goals", section: "Accountability", group: "Review", label: "Thoughts / Goals", type: "text" },
  { id: "if_then_plan", section: "Accountability", group: "Review", label: "If-Then Plan", type: "text" }
];

const palette = ["#34d399", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#22d3ee"];
const monthlyBudgets: Record<string, number> = {
  spend_protein: 6000,
  spend_fibre: 2000,
  spend_supplements: 3000,
  spend_body_care: 2500,
  spend_others: 4000
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setDate(date.getDate() - date.getDay());
  return next;
}

function getMonthDates(anchor: string) {
  const date = parseDate(anchor);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const result: string[] = [];
  for (let day = first; day.getMonth() === first.getMonth(); day = addDays(day, 1)) {
    result.push(formatDate(day));
  }
  return result;
}

function getWeekDates(anchor: string) {
  const first = startOfWeek(parseDate(anchor));
  return Array.from({ length: 7 }, (_, index) => formatDate(addDays(first, index)));
}

function labelDate(date: string) {
  return parseDate(date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit" });
}

function makeEmptyStore(): EntryStore {
  return { version: 1, entries: {} };
}

function readStore(): EntryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeEmptyStore();
    const parsed = JSON.parse(raw) as EntryStore;
    return parsed.version === 1 && parsed.entries ? parsed : makeEmptyStore();
  } catch {
    return makeEmptyStore();
  }
}

function isComplete(task: Task, value: string | number | boolean | undefined) {
  if (task.type === "check") return value === true;
  if (task.type === "number" || task.type === "money" || task.type === "rating") {
    return Number(value) > 0;
  }
  return String(value ?? "").trim().length > 0;
}

function numericValue(value: string | number | boolean | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function entryFor(store: EntryStore, date: string): DayEntry {
  return store.entries[date] ?? { date, values: {} };
}

function completionForDate(store: EntryStore, date: string, taskList = tasks) {
  const values = entryFor(store, date).values;
  const scored = taskList.filter((task) => task.type !== "text" && task.type !== "money");
  const done = scored.filter((task) => isComplete(task, values[task.id])).length;
  return { done, total: scored.length, pct: scored.length ? Math.round((done / scored.length) * 100) : 0 };
}

function sectionCompletion(store: EntryStore, dates: string[]) {
  const sections = [...new Set(tasks.map((task) => task.section))].filter((section) => section !== "Expenditure");
  return sections.map((section) => {
    const sectionTasks = tasks.filter((task) => task.section === section && task.type !== "text" && task.type !== "money");
    const total = sectionTasks.length * dates.length;
    const done = dates.reduce((sum, date) => {
      const values = entryFor(store, date).values;
      return sum + sectionTasks.filter((task) => isComplete(task, values[task.id])).length;
    }, 0);
    return { name: section, value: total ? Math.round((done / total) * 100) : 0, done, total };
  });
}

function expenseByCategory(store: EntryStore, dates: string[]) {
  return tasks
    .filter((task) => task.section === "Expenditure")
    .map((task) => ({
      name: task.label,
      value: dates.reduce((sum, date) => sum + numericValue(entryFor(store, date).values[task.id]), 0)
    }))
    .filter((item) => item.value > 0);
}

function exportCsv(store: EntryStore) {
  const header = ["date", ...tasks.map((task) => task.id)];
  const rows = Object.keys(store.entries)
    .sort()
    .map((date) => {
      const values = entryFor(store, date).values;
      return [date, ...tasks.map((task) => JSON.stringify(values[task.id] ?? ""))].join(",");
    });
  return [header.join(","), ...rows].join("\n");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const today = formatDate(new Date());
  const initialDate = today < START_DATE ? START_DATE : today;
  const [store, setStore] = useState<EntryStore>(() => readStore());
  const [anchorDate, setAnchorDate] = useState(initialDate);
  const [view, setView] = useState<ViewMode>("weekly");
  const [savedAt, setSavedAt] = useState("Loaded locally");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    setSavedAt(`Saved ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`);
  }, [store]);

  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const monthDates = useMemo(() => getMonthDates(anchorDate), [anchorDate]);
  const visibleDates = view === "monthly" ? monthDates : weekDates;
  const weekStats = weekDates.map((date) => ({ date: labelDate(date), ...completionForDate(store, date) }));
  const monthStats = monthDates.map((date) => ({ date, day: parseDate(date).getDate(), ...completionForDate(store, date) }));
  const sectionStats = sectionCompletion(store, visibleDates);
  const expenses = expenseByCategory(store, visibleDates);
  const totalSpend = expenses.reduce((sum, item) => sum + item.value, 0);
  const totalPlanned = tasks
    .filter((task) => task.section === "Expenditure")
    .reduce((sum, task) => sum + (monthlyBudgets[task.id] ?? 0), 0);
  const todayScore = completionForDate(store, anchorDate);
  const checkTasks = tasks.filter((task) => task.type === "check");
  const missedToday = checkTasks.filter((task) => !isComplete(task, entryFor(store, anchorDate).values[task.id]));

  const mindsetSeries = visibleDates.map((date) => {
    const values = entryFor(store, date).values;
    return {
      date: labelDate(date),
      Happiness: numericValue(values.daily_happiness),
      Satisfaction: numericValue(values.daily_satisfaction)
    };
  });

  function setValue(date: string, taskId: string, value: string | number | boolean) {
    setStore((current) => {
      const nextEntry = entryFor(current, date);
      return {
        ...current,
        entries: {
          ...current.entries,
          [date]: {
            date,
            values: {
              ...nextEntry.values,
              [taskId]: value
            }
          }
        }
      };
    });
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as EntryStore;
        if (parsed.version !== 1 || !parsed.entries) throw new Error("Invalid backup");
        setStore(parsed);
      } catch {
        alert("This backup file does not match the dashboard format.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetDemo() {
    if (!confirm("Clear all local dashboard entries in this browser?")) return;
    setStore(makeEmptyStore());
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Starting May 2026</p>
          <h1>Dashboard Real</h1>
          <p className="subtitle">Everyday goals, spending, mindset, and accountability in one local-first sheet.</p>
        </div>
        <div className="actions">
          <label className="date-control">
            <CalendarDays size={18} />
            <input min={START_DATE} type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
          </label>
          <button onClick={() => downloadFile("dashboard-real-backup.json", JSON.stringify(store, null, 2), "application/json")}>
            <FileJson size={18} /> JSON
          </button>
          <button onClick={() => downloadFile("dashboard-real-export.csv", exportCsv(store), "text/csv")}>
            <Download size={18} /> CSV
          </button>
          <button onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Import
          </button>
          <button className="ghost" onClick={resetDemo}>
            <RotateCcw size={18} /> Reset
          </button>
          <input ref={fileRef} hidden type="file" accept="application/json" onChange={importJson} />
        </div>
      </header>

      <section className="hero-grid">
        <MetricCard icon={<Target />} label="Selected Day" value={`${todayScore.pct}%`} detail={`${todayScore.done} / ${todayScore.total} tracked goals`} />
        <MetricCard icon={<Activity />} label="Week Completed" value={`${Math.round(weekStats.reduce((sum, day) => sum + day.pct, 0) / 7)}%`} detail="Average daily completion" />
        <MetricCard icon={<Save />} label="Storage" value="Local" detail={savedAt} />
        <MetricCard icon={<Github />} label="Deploy" value="Pages" detail="/Dashboard_Real/" />
      </section>

      <nav className="tabs" aria-label="Dashboard views">
        {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
          <button key={mode} className={view === mode ? "active" : ""} onClick={() => setView(mode)}>
            {mode}
          </button>
        ))}
      </nav>

      <section className="dashboard-grid">
        <Panel title={view === "monthly" ? "Monthly Progress" : "Weekly Progress"} className="wide">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={view === "monthly" ? monthStats : weekStats}>
              <CartesianGrid stroke="#25314b" vertical={false} />
              <XAxis dataKey={view === "monthly" ? "day" : "date"} stroke="#9ca3af" tickLine={false} />
              <YAxis stroke="#9ca3af" tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#121a2d", border: "1px solid #2a3654", borderRadius: 8 }} />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Category Rings">
          <div className="rings-grid">
            {sectionStats.map((section, index) => (
              <div className="ring-row" key={section.name}>
                <div
                  className="mini-ring"
                  style={
                    {
                      "--ring-color": palette[index % palette.length],
                      "--ring-value": `${section.value * 3.6}deg`
                    } as React.CSSProperties
                  }
                >
                  <span>{section.value}%</span>
                </div>
                <div>
                  <strong>{section.name}</strong>
                  <p>
                    {section.done} / {section.total} completed
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Mindset Tracker">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mindsetSeries}>
              <CartesianGrid stroke="#25314b" vertical={false} />
              <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} />
              <YAxis stroke="#9ca3af" tickLine={false} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: "#121a2d", border: "1px solid #2a3654", borderRadius: 8 }} />
              <Line type="monotone" dataKey="Happiness" stroke="#f472b6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Satisfaction" stroke="#22d3ee" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Expenditure" className="wide">
          <div className="expense-layout">
            <div className="expense-total">
              <span>Total spend</span>
              <strong>{MONEY.format(totalSpend)}</strong>
              <p>{MONEY.format(totalPlanned)} monthly plan for these categories.</p>
            </div>
            <div className="expense-table">
              {tasks
                .filter((task) => task.section === "Expenditure")
                .map((task) => {
                  const amount = visibleDates.reduce((sum, date) => sum + numericValue(entryFor(store, date).values[task.id]), 0);
                  const planned = monthlyBudgets[task.id] ?? 0;
                  return (
                    <div key={task.id}>
                      <span>{task.label}</span>
                      <strong>
                        {MONEY.format(amount)} / {MONEY.format(planned)}
                      </strong>
                    </div>
                  );
                })}
            </div>
          </div>
        </Panel>

        <Panel title="Accountability">
          <div className="accountability">
            <div>
              <span>Missed today</span>
              <strong>{missedToday.length}</strong>
            </div>
            <ul>
              {missedToday.slice(0, 7).map((task) => (
                <li key={task.id}>{task.label}</li>
              ))}
            </ul>
            <p>Use the If-Then Plan row for friction points: "If I miss X, then I do Y before sleep."</p>
          </div>
        </Panel>
      </section>

      <Spreadsheet dates={visibleDates} store={store} setValue={setValue} />
    </main>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Spreadsheet({
  dates,
  store,
  setValue
}: {
  dates: string[];
  store: EntryStore;
  setValue: (date: string, taskId: string, value: string | number | boolean) => void;
}) {
  const grouped = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = `${task.section} / ${task.group}`;
    acc[key] = [...(acc[key] ?? []), task];
    return acc;
  }, {});

  return (
    <section className="sheet-panel">
      <div className="sheet-heading">
        <div>
          <p className="eyebrow">Spreadsheet Entry</p>
          <h2>Daily Goal Table</h2>
        </div>
        <p>Checkboxes, numbers, ratings, spend, and notes save automatically in this browser.</p>
      </div>
      <div className="sheet-scroll">
        <table className="goal-sheet">
          <thead>
            <tr>
              <th className="task-col">Goal</th>
              <th className="type-col">Type</th>
              {dates.map((date) => (
                <th key={date}>{labelDate(date)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([group, groupTasks]) => (
              <React.Fragment key={group}>
                <tr className="group-row">
                  <td colSpan={dates.length + 2}>{group}</td>
                </tr>
                {groupTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="task-col">
                      <strong>{task.label}</strong>
                      <span>{task.unit ?? task.section}</span>
                    </td>
                    <td className="type-col">{task.type}</td>
                    {dates.map((date) => {
                      const value = entryFor(store, date).values[task.id];
                      return (
                        <td key={`${task.id}-${date}`}>
                          <CellEditor task={task} value={value} onChange={(next) => setValue(date, task.id, next)} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CellEditor({
  task,
  value,
  onChange
}: {
  task: Task;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) {
  if (task.type === "check") {
    return (
      <label className="check-cell">
        <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />
      </label>
    );
  }
  if (task.type === "text") {
    return <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder="..." />;
  }
  return (
    <input
      type="number"
      min={0}
      max={task.type === "rating" ? 10 : undefined}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
      placeholder={task.type === "rating" ? "0-10" : task.unit ?? "0"}
    />
  );
}

createRoot(document.getElementById("root")!).render(<App />);
