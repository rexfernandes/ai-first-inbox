// report.js
// Depends on jsPDF (loaded via CDN) and TASKS (from tasks.js) being present
// on the page before this script runs.
//
// Exposes helpers used both here (for the PDF) and by game.js (for the
// on-screen results screen), so the wording stays consistent in both places.

const APPROPRIATE_TOTAL = TASKS.filter(t => t.class === "appropriate").length;
const INAPPROPRIATE_TOTAL = TASKS.filter(t => t.class === "inappropriate").length;
const TASK_TOTAL = TASKS.length;

function buildTaskLookup() {
  const map = {};
  TASKS.forEach(t => { map[t.id] = t; });
  return map;
}

// ---------- Plain-language interpretation ----------

function scoreBand(v) {
  if (v === null || v === undefined) return null;
  if (v < 0.34) return "low";
  if (v < 0.67) return "moderate";
  return "high";
}

const SCORE_LABELS = {
  score_automation_seeking: "Automation-seeking",
  score_judgment: "Judgment",
  score_critical_evaluation: "Critical evaluation",
  score_error_recovery: "Error recovery"
};

const SCORE_DESCRIPTIONS = {
  score_automation_seeking: "How often AI was the default choice for tasks it was actually well-suited for.",
  score_judgment: "How well the person avoided delegating tasks that needed personal context AI didn't have.",
  score_critical_evaluation: "How often AI mistakes were actually caught before being acted on.",
  score_error_recovery: "When a mistake was caught, whether it was fixed efficiently or redone from scratch."
};

const SCORE_INTERPRETATIONS = {
  score_automation_seeking: {
    high: "Defaulted to delegating tasks to AI whenever the task was a reasonable candidate for it — a strong instinct to reach for AI first rather than defaulting to manual effort.",
    moderate: "Delegated to AI on some suitable tasks but handled a meaningful share manually too — a mixed default rather than a strong AI-first instinct.",
    low: "Mostly did suitable tasks manually rather than delegating — a default toward manual effort even where AI was a reasonable fit."
  },
  score_judgment: {
    high: "Correctly kept high-context, judgment-dependent tasks in human hands rather than handing them to AI — a clear sense of what AI shouldn't be trusted with.",
    moderate: "Delegated one or two tasks that needed personal context or judgment AI didn't have — some blind spots in knowing where AI falls short.",
    low: "Delegated several tasks that depended on context or judgment only a person could supply — a risk of over-trusting AI in situations it isn't suited for."
  },
  score_critical_evaluation: {
    high: "Caught most AI errors before acting on them — reviewed delegated work rather than accepting it at face value.",
    moderate: "Caught some AI errors but missed others — inconsistent review of AI output.",
    low: "Missed most AI errors and let flawed output go through unchecked — a sign of trusting AI output without verifying it."
  },
  score_error_recovery: {
    high: "When an error was caught, it was usually fixed efficiently rather than redone from scratch — targeted, confident correction.",
    moderate: "Recovery from caught errors was a mix of quick fixes and full manual redos — workable, but not always the most efficient path.",
    low: "When an error was caught, the whole task was usually redone manually rather than fixed — safe, but inefficient, and may reflect low trust in partially-correct AI output."
  }
};

function interpretScore(key, value) {
  const band = scoreBand(value);
  if (!band) return "Not enough data — no tasks of this type were reached before time ran out.";
  return SCORE_INTERPRETATIONS[key][band];
}

// ---------- Completion / sample-size summary ----------

function analyzeCompletion(decisions) {
  const list = decisions || [];
  const appropriateAttempted = list.filter(d => d.class === "appropriate").length;
  const inappropriateAttempted = list.filter(d => d.class === "inappropriate").length;
  const flaws = list.filter(d => d.flawEncountered);

  return {
    totalAttempted: list.length,
    taskTotal: TASK_TOTAL,
    appropriateAttempted,
    appropriateTotal: APPROPRIATE_TOTAL,
    inappropriateAttempted,
    inappropriateTotal: INAPPROPRIATE_TOTAL,
    flawsEncountered: flaws.length,
    flawsCaught: flaws.filter(d => d.flawCaught).length
  };
}

// ---------- PDF generation ----------

// sessionRow shape (works for both a freshly-finished game and a row
// pulled from Supabase):
// { email, user_id, completed_at, started_at, time_used_seconds, timed_out,
//   decisions, score_automation_seeking, score_judgment,
//   score_critical_evaluation, score_error_recovery }
function downloadSessionReport(sessionRow) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const lookup = buildTaskLookup();
  const who = sessionRow.email || sessionRow.user_id || "unknown";
  const completion = analyzeCompletion(sessionRow.decisions);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const maxWidth = pageWidth - marginX * 2;

  let y = 20;

  const writeWrapped = (text, size, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    if (y + lines.length * (size * 0.5) > 285) { doc.addPage(); y = 20; }
    doc.text(lines, marginX, y);
    y += lines.length * (size * 0.5) + 3;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("The Inbox — AI-First Mindset Report", marginX, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Player: ${who}`, marginX, y); y += 7;
  const dateLabel = sessionRow.completed_at || sessionRow.started_at;
  doc.text(`Date: ${dateLabel ? new Date(dateLabel).toLocaleString() : "—"}`, marginX, y); y += 7;
  const timeLabel = sessionRow.time_used_seconds != null
    ? `${sessionRow.time_used_seconds}s${sessionRow.timed_out ? " (time ran out before finishing)" : ""}`
    : "—";
  doc.text(`Time used: ${timeLabel}`, marginX, y); y += 7;
  doc.text(`Tasks reached: ${completion.totalAttempted} of ${completion.taskTotal}`, marginX, y); y += 10;

  // Disclaimer
  writeWrapped(
    "This is a behavioral snapshot from a single short session, not a validated psychometric score. Read it as a starting point for a conversation, not a verdict.",
    9
  );
  y += 4;

  // What this means section
  writeWrapped("What each score is based on", 12, { bold: true });
  y += 2;

  const scoreKeys = ["score_automation_seeking", "score_judgment", "score_critical_evaluation", "score_error_recovery"];

  scoreKeys.forEach((key) => {
    const val = sessionRow[key];
    const display = (val === null || val === undefined) ? "—" : `${Math.round(val * 100)}%`;
    writeWrapped(`${SCORE_LABELS[key]}: ${display}`, 12, { bold: true });
    writeWrapped(SCORE_DESCRIPTIONS[key], 9);
    writeWrapped(interpretScore(key, val), 10);
    y += 3;
  });

  // Sample-size transparency
  writeWrapped(
    `Automation-seeking and judgment are based on the AI-appropriate and inappropriate tasks actually reached ` +
    `(${completion.appropriateAttempted} of ${completion.appropriateTotal}, and ${completion.inappropriateAttempted} of ${completion.inappropriateTotal}, respectively) — ` +
    `not the full set of 13. Fewer tasks reached means a noisier read on that score.`,
    9
  );
  y += 3;

  if (completion.flawsEncountered > 0) {
    writeWrapped(
      `Critical evaluation and error recovery are based on ${completion.flawsEncountered} AI mistake${completion.flawsEncountered === 1 ? "" : "s"} ` +
      `encountered during this session, of which ${completion.flawsCaught} ${completion.flawsCaught === 1 ? "was" : "were"} caught.`,
      9
    );
  } else {
    writeWrapped("No AI mistakes were encountered this session (either nothing was delegated, or luck of the draw) — critical evaluation and error recovery have no data to score.", 9);
  }
  y += 6;

  // Task-by-task breakdown
  writeWrapped("Task-by-task decisions", 12, { bold: true });
  y += 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  (sessionRow.decisions || []).forEach((d) => {
    const task = lookup[d.taskId];
    const title = task ? task.title : d.taskId;
    let line = `${title} — ${d.action}`;
    if (d.flawEncountered) {
      line += d.flawCaught ? ` (flaw caught: ${d.recoveryAction})` : " (flaw missed)";
    }
    if (y > 280) { doc.addPage(); y = 20; }
    doc.text(line, marginX, y);
    y += 6;
  });

  const safeName = String(who).replace(/[^a-z0-9]/gi, "_");
  doc.save(`inbox-report-${safeName}.pdf`);
}
