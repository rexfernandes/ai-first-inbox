// report.js
// Depends on jsPDF (loaded via CDN) and TASKS (from tasks.js) being present
// on the page before this script runs.

function buildTaskLookup() {
  const map = {};
  TASKS.forEach(t => { map[t.id] = t; });
  return map;
}

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

  const scoreRows = [
    ["Automation-seeking", sessionRow.score_automation_seeking],
    ["Judgment", sessionRow.score_judgment],
    ["Critical evaluation", sessionRow.score_critical_evaluation],
    ["Error recovery", sessionRow.score_error_recovery]
  ];

  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("The Inbox — AI-First Mindset Report", 14, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Player: ${who}`, 14, y); y += 7;
  const dateLabel = sessionRow.completed_at || sessionRow.started_at;
  doc.text(`Date: ${dateLabel ? new Date(dateLabel).toLocaleString() : "—"}`, 14, y); y += 7;
  const timeLabel = sessionRow.time_used_seconds != null
    ? `${sessionRow.time_used_seconds}s${sessionRow.timed_out ? " (timed out before finishing)" : ""}`
    : "—";
  doc.text(`Time used: ${timeLabel}`, 14, y); y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Subscores", 14, y); y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  scoreRows.forEach(([label, val]) => {
    const display = (val === null || val === undefined) ? "—" : `${Math.round(val * 100)}%`;
    doc.text(`${label}: ${display}`, 14, y);
    y += 7;
  });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Task-by-task decisions", 14, y); y += 8;

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
    doc.text(line, 14, y);
    y += 6;
  });

  const safeName = String(who).replace(/[^a-z0-9]/gi, "_");
  doc.save(`inbox-report-${safeName}.pdf`);
}
