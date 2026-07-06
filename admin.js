// admin.js

const el = (id) => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  el(`screen-${name}`).classList.add("active");
}

async function sendMagicLink(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  return error;
}

async function loadDashboard() {
  const { data, error } = await sb.rpc("get_all_sessions_with_email");

  if (error) {
    console.error(error);
    showScreen("denied");
    return;
  }

  // The RPC itself checks admin status server-side and returns an empty
  // set (not an error) for non-admins, so an empty result is ambiguous —
  // treat it as "no data yet" rather than denying access outright.
  showScreen("dashboard");
  el("dashboard-meta").textContent = `${data.length} session${data.length === 1 ? "" : "s"} recorded.`;
  renderRows(data);
}

function fmtScore(v) {
  return (v === null || v === undefined) ? "—" : `${Math.round(v * 100)}%`;
}

function renderRows(rows) {
  const tbody = el("sessions-tbody");
  tbody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const completed = row.completed_at
      ? new Date(row.completed_at).toLocaleString()
      : (row.timed_out ? "timed out" : "in progress");

    tr.innerHTML = `
      <td>${row.email}</td>
      <td>${completed}</td>
      <td>${fmtScore(row.score_automation_seeking)}</td>
      <td>${fmtScore(row.score_judgment)}</td>
      <td>${fmtScore(row.score_critical_evaluation)}</td>
      <td>${fmtScore(row.score_error_recovery)}</td>
      <td>${row.time_used_seconds != null ? row.time_used_seconds + "s" : "—"}</td>
      <td></td>
    `;

    const downloadCell = tr.lastElementChild;
    const btn = document.createElement("button");
    btn.className = "btn-download-row";
    btn.textContent = "Report";
    btn.addEventListener("click", () => downloadSessionReport(row));
    downloadCell.appendChild(btn);

    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await loadDashboard();
  } else {
    showScreen("login");
  }

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await loadDashboard();
    }
  });

  el("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = el("login-email").value.trim();
    if (!email) return;
    el("login-status").textContent = "Sending link…";
    const error = await sendMagicLink(email);
    el("login-status").textContent = error
      ? "Something went wrong. Try again."
      : "Check your email for a login link.";
  });
});
