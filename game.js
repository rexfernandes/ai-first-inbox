// game.js
// Depends on: config.js, tasks.js, scoring.js, and a global `sb` client
// created in index.html from supabase-js.

const state = {
  user: null,
  taskQueue: [],
  currentIndex: 0,
  timeRemaining: CONFIG.totalTimeSeconds,
  timerHandle: null,
  decisions: [],
  sessionId: null,
  timedOut: false
};

const el = (id) => document.getElementById(id);

// ---------- Auth ----------

async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    state.user = session.user;
    showScreen("intro");
  } else {
    showScreen("login");
  }

  sb.auth.onAuthStateChange((_event, session) => {
    if (session) {
      state.user = session.user;
      showScreen("intro");
    }
  });
}

async function sendMagicLink(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  return error;
}

// ---------- Screen management ----------

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  el(`screen-${name}`).classList.add("active");
}

// ---------- Game flow ----------

function startGame() {
  state.taskQueue = shuffle([...TASKS]);
  state.currentIndex = 0;
  state.timeRemaining = CONFIG.totalTimeSeconds;
  state.decisions = [];
  state.timedOut = false;

  showScreen("game");
  startTimer();
  renderTask();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startTimer() {
  updateTimerDisplay();
  state.timerHandle = setInterval(() => {
    state.timeRemaining -= 1;
    updateTimerDisplay();
    if (state.timeRemaining <= 0) {
      state.timedOut = true;
      clearInterval(state.timerHandle);
      endGame();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(Math.max(0, state.timeRemaining) / 60);
  const s = Math.max(0, state.timeRemaining) % 60;
  el("timer").textContent = `${m}:${s.toString().padStart(2, "0")}`;
  el("timer").classList.toggle("low", state.timeRemaining <= 30);
}

function spendTime(seconds) {
  state.timeRemaining -= seconds;
  updateTimerDisplay();
  if (state.timeRemaining <= 0) {
    state.timedOut = true;
    clearInterval(state.timerHandle);
    endGame();
  }
}

function currentTask() {
  return state.taskQueue[state.currentIndex];
}

function renderTask() {
  const task = currentTask();
  if (!task) {
    clearInterval(state.timerHandle);
    endGame();
    return;
  }

  el("task-counter").textContent = `Task ${state.currentIndex + 1} of ${state.taskQueue.length}`;
  el("task-title").textContent = task.title;
  el("task-brief").textContent = task.brief;
  el("task-actions").classList.remove("hidden");
  el("ai-review").classList.add("hidden");
}

function recordDecision(record) {
  state.decisions.push(record);
  advance();
}

function advance() {
  state.currentIndex += 1;
  if (state.currentIndex >= state.taskQueue.length) {
    clearInterval(state.timerHandle);
    endGame();
  } else {
    renderTask();
  }
}

// ---------- Player actions ----------

function chooseManual() {
  const task = currentTask();
  spendTime(task.manualCost);
  recordDecision({
    taskId: task.id,
    class: task.class,
    action: "manual",
    flawEncountered: false,
    flawCaught: null,
    recoveryAction: null
  });
}

function chooseSkip() {
  const task = currentTask();
  recordDecision({
    taskId: task.id,
    class: task.class,
    action: "skip",
    flawEncountered: false,
    flawCaught: null,
    recoveryAction: null
  });
}

function chooseDelegate() {
  const task = currentTask();
  spendTime(task.aiCost);

  const flawTriggered = task.flawChance > 0 && Math.random() < task.flawChance;

  if (task.class === "inappropriate" || !flawTriggered) {
    // No AI output to review — either it's an inappropriate task (context-only,
    // no artifact shown) or the delegated task came back clean.
    recordDecision({
      taskId: task.id,
      class: task.class,
      action: "delegate",
      flawEncountered: false,
      flawCaught: null,
      recoveryAction: null
    });
    return;
  }

  // Show the AI output for review
  showAiReview(task);
}

function showAiReview(task) {
  el("task-actions").classList.add("hidden");
  el("ai-review").classList.remove("hidden");
  el("ai-output").textContent = task.flaw.aiOutput;

  el("btn-accept").onclick = () => resolveReview(task, "accepted", false);
  el("btn-fix").onclick = () => resolveReview(task, "fix", true);
  el("btn-redo").onclick = () => resolveReview(task, "redo", true);
}

function resolveReview(task, action, caught) {
  if (action === "fix") spendTime(CONFIG.fixCostSeconds);
  if (action === "redo") spendTime(CONFIG.redoCostSeconds);

  recordDecision({
    taskId: task.id,
    class: task.class,
    action: "delegate",
    flawEncountered: true,
    flawCaught: caught,
    recoveryAction: action
  });
}

// ---------- End of game ----------

async function endGame() {
  const scores = computeScores(state.decisions);
  state.lastScores = scores;
  showScreen("results");
  renderResultsSummary(scores);
  await saveSession(scores);
}

function buildOwnSessionRow(scores) {
  return {
    email: state.user.email,
    user_id: state.user.id,
    completed_at: new Date().toISOString(),
    time_used_seconds: CONFIG.totalTimeSeconds - Math.max(0, state.timeRemaining),
    timed_out: state.timedOut,
    decisions: state.decisions,
    ...scores
  };
}

function renderResultsSummary(scores) {
  const fmt = (v) => (v === null ? "—" : Math.round(v * 100) + "%");
  const completion = analyzeCompletion(state.decisions);

  const rows = [
    ["score_automation_seeking", "Automation-seeking"],
    ["score_judgment", "Judgment"],
    ["score_critical_evaluation", "Critical evaluation"],
    ["score_error_recovery", "Error recovery"]
  ];

  const completionNote = `Reached ${completion.totalAttempted} of ${completion.taskTotal} tasks`
    + (state.timedOut ? " (time ran out before finishing)." : ".");

  el("results-summary").innerHTML = `
    <p class="status" style="margin-bottom:16px;">${completionNote}</p>
    ${rows.map(([key, label]) => `
      <div class="score-row" style="flex-direction:column; align-items:flex-start; gap:4px; padding:14px 0;">
        <div style="display:flex; justify-content:space-between; width:100%;">
          <strong>${label}</strong><span>${fmt(scores[key])}</span>
        </div>
        <p style="margin:0; font-size:13px;">${interpretScore(key, scores[key])}</p>
      </div>
    `).join("")}
    <p class="status" style="margin-top:12px;">This is a single-session snapshot, not a validated score — useful as a starting point for a conversation, not a verdict.</p>
  `;
}

async function saveSession(scores) {
  const timeUsed = CONFIG.totalTimeSeconds - Math.max(0, state.timeRemaining);
  const { error } = await sb.from("sessions").insert({
    user_id: state.user.id,
    completed_at: new Date().toISOString(),
    time_used_seconds: timeUsed,
    timed_out: state.timedOut,
    decisions: state.decisions,
    ...scores
  });
  if (error) {
    console.error("Failed to save session:", error);
    el("save-status").textContent = "Couldn't save your results — check your connection and try refreshing.";
  } else {
    el("save-status").textContent = "Results saved.";
  }
}

// ---------- Wire up static UI ----------

document.addEventListener("DOMContentLoaded", () => {
  initAuth();

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

  el("btn-download-report").addEventListener("click", () => {
    if (!state.lastScores) return;
    downloadSessionReport(buildOwnSessionRow(state.lastScores));
  });

  el("btn-start").addEventListener("click", startGame);
  el("btn-manual").addEventListener("click", chooseManual);
  el("btn-delegate").addEventListener("click", chooseDelegate);
  el("btn-skip").addEventListener("click", chooseSkip);
});
