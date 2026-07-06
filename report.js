// report.js
// Depends on jsPDF + jspdf-autotable (CDN) and TASKS (from tasks.js) being
// present on the page before this script runs.
//
// Exposes helpers used both here (for the PDF) and by game.js (for the
// on-screen results screen), so wording stays consistent in both places.

const APPROPRIATE_TOTAL = TASKS.filter(t => t.class === "appropriate").length;
const INAPPROPRIATE_TOTAL = TASKS.filter(t => t.class === "inappropriate").length;
const TASK_TOTAL = TASKS.length;

function buildTaskLookup() {
  const map = {};
  TASKS.forEach(t => { map[t.id] = t; });
  return map;
}

// ---------- Construct definitions (used in Introduction) ----------

const ASSESSMENT_INTRO = {
  construct: "AI-first mindset",
  summary:
    "AI-first mindset describes a working style that defaults to using AI where it " +
    "genuinely helps, while retaining sound judgment about where it shouldn't be " +
    "trusted, and staying accountable for the quality of what it produces. It is " +
    "not simply enthusiasm for AI tools — someone can score poorly here by " +
    "over-relying on AI just as easily as by avoiding it.",
  method:
    "This assessment (\"The Inbox\") is a short simulation, not a questionnaire. " +
    "The player works through a queue of realistic work tasks under a fixed time " +
    "budget, choosing for each one whether to do it manually, delegate it to an " +
    "AI assistant, or skip it. Some delegated tasks come back with a planted " +
    "error, requiring the player to notice it and decide how to respond. Behavior " +
    "under time pressure, not self-report, is what generates the four scores below."
};

// ---------- Score dimensions: descriptors + BARS anchors ----------

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

// Behaviorally Anchored Rating Scale anchors: generic descriptions of what
// each band of behavior looks like, independent of any one person's result.
const BARS_ANCHORS = {
  score_automation_seeking: {
    high: "Consistently identifies tasks suited to AI delegation and acts on that judgment as a default working pattern.",
    moderate: "Recognizes some opportunities for AI delegation but inconsistently acts on them, mixing manual and delegated approaches.",
    low: "Defaults to manual completion of tasks even when AI delegation would be efficient and appropriate."
  },
  score_judgment: {
    high: "Reliably distinguishes tasks that require personal context or judgment from those suited to AI, keeping the former manual.",
    moderate: "Occasionally delegates tasks that require personal context or nuanced judgment, indicating partial awareness of AI's limits.",
    low: "Frequently delegates high-context or judgment-dependent tasks to AI, indicating limited awareness of where AI assistance is inappropriate."
  },
  score_critical_evaluation: {
    high: "Actively reviews AI-generated output and reliably identifies inaccuracies before acting on them.",
    moderate: "Reviews AI output inconsistently, catching some errors while missing others.",
    low: "Accepts AI-generated output largely at face value, rarely identifying embedded errors."
  },
  score_error_recovery: {
    high: "Responds to identified AI errors with efficient, targeted corrections.",
    moderate: "Responds to identified errors with a mix of targeted fixes and full manual redos.",
    low: "Responds to identified errors by discarding AI output entirely and redoing the task manually, reflecting low confidence in partial correction."
  }
};

function scoreBand(v) {
  if (v === null || v === undefined) return null;
  if (v < 0.34) return "low";
  if (v < 0.67) return "moderate";
  return "high";
}

function interpretScore(key, value) {
  const band = scoreBand(value);
  if (!band) return "Not enough data — no tasks of this type were reached before time ran out.";
  return BARS_ANCHORS[key][band];
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

const BAND_LABEL = { low: "Low", moderate: "Moderate", high: "High" };

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
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;

  let y = 20;

  const ensureRoom = (needed) => {
    if (y + needed > 285) { doc.addPage(); y = 20; }
  };

  const heading = (text) => {
    ensureRoom(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(text, marginX, y);
    y += 8;
  };

  const paragraph = (text, size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    ensureRoom(lines.length * (size * 0.5) + 2);
    doc.text(lines, marginX, y);
    y += lines.length * (size * 0.5) + 4;
  };

  const afterTable = () => { y = doc.lastAutoTable.finalY + 8; };

  // ---------- Cover / header ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("The Inbox — AI-First Mindset Report", marginX, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Player: ${who}`, marginX, y); y += 6;
  const dateLabel = sessionRow.completed_at || sessionRow.started_at;
  doc.text(`Date: ${dateLabel ? new Date(dateLabel).toLocaleString() : "-"}`, marginX, y); y += 6;
  const timeLabel = sessionRow.time_used_seconds != null
    ? `${sessionRow.time_used_seconds}s${sessionRow.timed_out ? " (time ran out before finishing)" : ""}`
    : "-";
  doc.text(`Time used: ${timeLabel}`, marginX, y); y += 6;
  doc.text(`Tasks reached: ${completion.totalAttempted} of ${completion.taskTotal}`, marginX, y); y += 10;

  // ---------- 1. Introduction ----------
  heading("1. Introduction");
  paragraph(`What this assessment measures: ${ASSESSMENT_INTRO.summary}`);
  paragraph(`Method: ${ASSESSMENT_INTRO.method}`);
  paragraph(
    "This is a behavioral snapshot from a single short session, not a validated " +
    "psychometric instrument. Treat it as a starting point for a conversation " +
    "about working style, not a verdict.",
    9
  );
  y += 2;

  // ---------- 2. Score descriptors ----------
  heading("2. Score descriptors");
  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Dimension", "What it measures"]],
    body: Object.keys(SCORE_LABELS).map(key => [SCORE_LABELS[key], SCORE_DESCRIPTIONS[key]]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [18, 23, 43] },
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } }
  });
  afterTable();

  // ---------- 3. Behaviorally Anchored Rating Scale ----------
  heading("3. Behaviorally anchored rating scale (BARS)");
  paragraph("Each dimension below is scored on three bands. The band this session actually landed in is highlighted.", 9);

  Object.keys(SCORE_LABELS).forEach((key) => {
    const val = sessionRow[key];
    const band = scoreBand(val);
    const display = (val === null || val === undefined) ? "-" : `${Math.round(val * 100)}%`;

    ensureRoom(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${SCORE_LABELS[key]} — ${display}${band ? ` (${BAND_LABEL[band]})` : ""}`, marginX, y);
    y += 6;

    doc.autoTable({
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Band", "Behavioral anchor"]],
      body: [
        ["High (67-100%)", BARS_ANCHORS[key].high],
        ["Moderate (34-66%)", BARS_ANCHORS[key].moderate],
        ["Low (0-33%)", BARS_ANCHORS[key].low]
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [18, 23, 43] },
      columnStyles: { 0: { cellWidth: 34, fontStyle: "bold" } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const rowBand = ["high", "moderate", "low"][data.row.index];
        if (band && rowBand === band) {
          data.cell.styles.fillColor = [232, 163, 61];
          data.cell.styles.textColor = [18, 23, 43];
        }
      }
    });
    afterTable();
  });

  // ---------- 4. Confidence / sample size ----------
  heading("4. Confidence in these scores");
  paragraph(
    `Automation-seeking and judgment are based on the AI-appropriate and inappropriate ` +
    `tasks actually reached (${completion.appropriateAttempted} of ${completion.appropriateTotal}, and ` +
    `${completion.inappropriateAttempted} of ${completion.inappropriateTotal} respectively) — not the full set of ` +
    `${completion.taskTotal}. Fewer tasks reached means a noisier read on that score.`,
    9
  );
  if (completion.flawsEncountered > 0) {
    paragraph(
      `Critical evaluation and error recovery are based on ${completion.flawsEncountered} AI mistake` +
      `${completion.flawsEncountered === 1 ? "" : "s"} encountered this session, of which ` +
      `${completion.flawsCaught} ${completion.flawsCaught === 1 ? "was" : "were"} caught.`,
      9
    );
  } else {
    paragraph("No AI mistakes were encountered this session — critical evaluation and error recovery have no data to score.", 9);
  }
  y += 2;

  // ---------- 5. Task-by-task decision log ----------
  heading("5. Task-by-task decision log");
  const logRows = (sessionRow.decisions || []).map((d) => {
    const task = lookup[d.taskId];
    const title = task ? task.title : d.taskId;
    let outcome = "-";
    if (d.flawEncountered) {
      outcome = d.flawCaught ? `Flaw caught (${d.recoveryAction})` : "Flaw missed";
    }
    return [title, d.action, outcome];
  });

  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Task", "Action taken", "AI outcome"]],
    body: logRows,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    headStyles: { fillColor: [18, 23, 43] }
  });

  const safeName = String(who).replace(/[^a-z0-9]/gi, "_");
  doc.save(`inbox-report-${safeName}.pdf`);
}
