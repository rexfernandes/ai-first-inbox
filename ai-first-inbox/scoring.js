// scoring.js
// Computes the 4 subscores from a raw decision log.
// Each decision record looks like:
// { taskId, class, action: "manual"|"delegate"|"skip",
//   flawEncountered: bool, flawCaught: bool|null, recoveryAction: "fix"|"redo"|"accepted"|null }

function computeScores(decisions) {
  const appropriate = decisions.filter(d => d.class === "appropriate");
  const inappropriate = decisions.filter(d => d.class === "inappropriate");

  // 1. Automation-seeking: of the AI-appropriate tasks, how many were delegated
  const appropriateDelegated = appropriate.filter(d => d.action === "delegate").length;
  const automationSeeking = appropriate.length
    ? appropriateDelegated / appropriate.length
    : null;

  // 2. Judgment: of the AI-inappropriate tasks, how many were correctly kept manual
  const inappropriateManual = inappropriate.filter(d => d.action === "manual").length;
  const judgment = inappropriate.length
    ? inappropriateManual / inappropriate.length
    : null;

  // 3. Critical evaluation: of flaws actually encountered, how many were caught
  // (caught = player chose "fix" or "redo" rather than blindly accepting)
  const flawsEncountered = decisions.filter(d => d.flawEncountered);
  const flawsCaught = flawsEncountered.filter(d => d.flawCaught === true);
  const criticalEvaluation = flawsEncountered.length
    ? flawsCaught.length / flawsEncountered.length
    : null;

  // 4. Error recovery: quality of response *given* a flaw was caught.
  // Fixing (efficient, targeted correction) scores higher than a full manual redo
  // (safe, but treats every error as untrustworthy rather than diagnosing it).
  const recoveryWeights = { fix: 1.0, redo: 0.6 };
  const recoveryScored = flawsCaught.filter(d => recoveryWeights[d.recoveryAction] !== undefined);
  const errorRecovery = recoveryScored.length
    ? recoveryScored.reduce((sum, d) => sum + recoveryWeights[d.recoveryAction], 0) / recoveryScored.length
    : null;

  return {
    score_automation_seeking: automationSeeking,
    score_judgment: judgment,
    score_critical_evaluation: criticalEvaluation,
    score_error_recovery: errorRecovery
  };
}
