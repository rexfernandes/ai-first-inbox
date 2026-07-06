// tasks.js
// Content for "The Inbox" — AI-first mindset assessment.
// Each task has a fixed "appropriateness" class used for scoring.
// This file is the only thing you should need to edit to tweak content.

const TASKS = [
  // ---- AI-APPROPRIATE (delegating is the "right" default) ----
  {
    id: "t01",
    class: "appropriate",
    title: "Summarize the vendor contract",
    brief: "12-page vendor renewal contract just landed. Legal needs the 3 key changes vs. last year, in bullets, in the next few minutes.",
    manualCost: 90,   // seconds if done by hand
    aiCost: 20,       // seconds if delegated
    flawChance: 0.6,
    flaw: {
      type: "subtle",
      aiOutput: "Key changes: 1) Payment terms shortened to Net-15. 2) Auto-renewal clause added. 3) Liability cap raised to $2M.",
      actualIssue: "The contract's liability cap was raised to $1.2M, not $2M — the AI misread a nearby figure in the document.",
      correctedOutput: "Key changes: 1) Payment terms shortened to Net-15. 2) Auto-renewal clause added. 3) Liability cap raised to $1.2M."
    }
  },
  {
    id: "t02",
    class: "appropriate",
    title: "Reschedule-meeting email",
    brief: "Tuesday's planning meeting needs to move to Thursday. Team needs a short heads-up email.",
    manualCost: 60,
    aiCost: 10,
    flawChance: 0.3,
    flaw: {
      type: "obvious",
      aiOutput: "Hi team, quick note — our planning meeting is moving from Tuesday to Wednesday. Same time, same room. Thanks!",
      actualIssue: "The AI wrote 'Wednesday' instead of 'Thursday.'",
      correctedOutput: "Hi team, quick note — our planning meeting is moving from Tuesday to Thursday. Same time, same room. Thanks!"
    }
  },
  {
    id: "t03",
    class: "appropriate",
    title: "Clean up the expense sheet",
    brief: "This month's expense spreadsheet has inconsistent date formats and duplicate rows. Needs a quick clean pass before finance sees it.",
    manualCost: 120,
    aiCost: 25,
    flawChance: 0.5,
    flaw: {
      type: "obvious",
      aiOutput: "Cleaned. Removed 4 duplicate rows, standardized dates to DD/MM/YYYY.",
      actualIssue: "It only removed 3 of the 4 duplicates — one near the bottom is still there.",
      correctedOutput: "Cleaned. Removed all 4 duplicate rows, standardized dates to DD/MM/YYYY."
    }
  },
  {
    id: "t04",
    class: "appropriate",
    title: "Draft launch captions",
    brief: "Need 3 short social captions for tomorrow's product launch post. Marketing will pick one.",
    manualCost: 90,
    aiCost: 15,
    flawChance: 0.4,
    flaw: {
      type: "subtle",
      aiOutput: "1) 'The wait is over — meet the future, today.' 2) 'Built different. Built for you.' 3) 'This changes everything. Literally.'",
      actualIssue: "None of the three actually mention the product name or category — they're generic enough to be for any launch.",
      correctedOutput: "1) 'Meet [Product] — the future, today.' 2) 'Built different. Built for how you actually work.' 3) '[Product] changes how your day starts.'"
    }
  },
  {
    id: "t05",
    class: "appropriate",
    title: "Turn the voice memo into notes",
    brief: "You rambled a 5-minute voice memo on the drive in about next quarter's priorities. Needs to become clean bullet notes.",
    manualCost: 100,
    aiCost: 20,
    flawChance: 0.5,
    flaw: {
      type: "obvious",
      aiOutput: "Priorities: 1) Ship the mobile redesign. 2) Hire two engineers. 3) Cut the vendor contract by Q2.",
      actualIssue: "The memo said 'renegotiate' the vendor contract, not 'cut' it — a meaningfully different action.",
      correctedOutput: "Priorities: 1) Ship the mobile redesign. 2) Hire two engineers. 3) Renegotiate the vendor contract by Q2."
    }
  },
  {
    id: "t06",
    class: "appropriate",
    title: "Build the quarter-comparison table",
    brief: "Need last 4 quarters' revenue numbers laid out in a simple comparison table for a deck slide.",
    manualCost: 80,
    aiCost: 15,
    flawChance: 0.55,
    flaw: {
      type: "obvious",
      aiOutput: "Q1: $1.2M | Q2: $1.4M | Q3: $1.1M | Q4: $1.6M",
      actualIssue: "Q3 was actually $1.3M, not $1.1M — a transcription slip.",
      correctedOutput: "Q1: $1.2M | Q2: $1.4M | Q3: $1.3M | Q4: $1.6M"
    }
  },
  {
    id: "t07",
    class: "appropriate",
    title: "Draft the FAQ first pass",
    brief: "Support wants a first-draft FAQ pulled together from the product docs before their team edits it.",
    manualCost: 110,
    aiCost: 25,
    flawChance: 0.35,
    flaw: {
      type: "subtle",
      aiOutput: "Q: Can I use this on multiple devices? A: Yes, your plan supports unlimited devices.",
      actualIssue: "The docs actually say plans support up to 3 devices, not unlimited — the AI overstated it.",
      correctedOutput: "Q: Can I use this on multiple devices? A: Yes, your plan supports up to 3 devices."
    }
  },
  {
    id: "t08",
    class: "appropriate",
    title: "Turn the report into a slide outline",
    brief: "Need this written report restructured into a 6-slide outline for tomorrow's review.",
    manualCost: 100,
    aiCost: 20,
    flawChance: 0.4,
    flaw: {
      type: "obvious",
      aiOutput: "Slide 4: 'Q3 Results' — covers revenue growth and churn.",
      actualIssue: "The report's Q3 section didn't discuss churn at all — that's from a different section entirely.",
      correctedOutput: "Slide 4: 'Q3 Results' — covers revenue growth and margin."
    }
  },

  // ---- AI-INAPPROPRIATE (needs context/judgment only you have) ----
  {
    id: "t09",
    class: "inappropriate",
    title: "Tell Sam his project is cancelled",
    brief: "Leadership just killed the project Sam has been leading for 6 months. He needs to hear it from you, today.",
    manualCost: 150,
    aiCost: 20,
    flawChance: 0 // not applicable — scored purely on delegate/no-delegate
  },
  {
    id: "t10",
    class: "inappropriate",
    title: "Decide which vendor to drop",
    brief: "Two vendors are both underperforming on paper. You know one of them just went through a rough leadership change and deserves one more quarter — that context isn't written anywhere.",
    manualCost: 120,
    aiCost: 20,
    flawChance: 0
  },
  {
    id: "t11",
    class: "inappropriate",
    title: "Reply to the angry client",
    brief: "A client's email is unusually sharp. You know it's because of a call last week that was never documented anywhere.",
    manualCost: 130,
    aiCost: 20,
    flawChance: 0
  },
  {
    id: "t12",
    class: "inappropriate",
    title: "Decide whether to escalate to HR",
    brief: "A teammate mentioned a conflict that might be nothing, or might be worth flagging. Only you have the fuller picture from other conversations.",
    manualCost: 110,
    aiCost: 20,
    flawChance: 0
  },
  {
    id: "t13",
    class: "inappropriate",
    title: "Give Priya hard feedback",
    brief: "Priya's behavior in meetings has been an issue. She needs direct, kind, specific feedback from you before Friday.",
    manualCost: 140,
    aiCost: 20,
    flawChance: 0
  }
];

// Game-level config
const CONFIG = {
  totalTimeSeconds: 360, // 6 minutes
  reviewCostSeconds: 15, // extra time cost to actually check an AI result carefully
  fixCostSeconds: 25,    // time cost to fix a caught flaw rather than redo from scratch
  redoCostSeconds: 70    // time cost to redo manually after catching a flaw
};
