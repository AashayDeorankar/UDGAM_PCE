/**
 * In-memory analytics for interview performance.
 * Stores scores per user and provides summaries.
 */

const userScores = new Map();

function getNow() {
  return Date.now();
}

function ensureUser(userId) {
  const id = userId || "anonymous";
  if (!userScores.has(id)) {
    userScores.set(id, { scores: [], updatedAt: getNow() });
  }
  return userScores.get(id);
}

export function recordInterviewScore({ userId, score, type, company }) {
  const data = ensureUser(userId);
  data.scores.push({
    score: Number(score) || 0,
    type: type || "hr",
    company: company || null,
    at: getNow(),
  });
  data.updatedAt = getNow();
}

function calcAverage(scores) {
  if (!scores.length) return 0;
  const sum = scores.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
  return Math.round(sum / scores.length);
}

function readinessFromScore(avg) {
  if (avg >= 75) return "High";
  if (avg >= 55) return "Medium";
  return "Low";
}

export function getUserSummary(userId) {
  const data = ensureUser(userId);
  const scores = data.scores;
  const averageScore = calcAverage(scores);
  const recentScores = scores.slice(-5).map((s) => s.score);
  const assessmentScores = scores.filter((s) => String(s.type || "").startsWith("assessment")).map((s) => s.score);
  const recentAssessmentScores = assessmentScores.slice(-5);
  const assessmentAverage = calcAverage(scores.filter((s) => String(s.type || "").startsWith("assessment")));
  return {
    averageScore,
    recentScores,
    totalAttempts: scores.length,
    readiness: readinessFromScore(averageScore),
    assessmentAverage,
    recentAssessmentScores,
    assessmentAttempts: assessmentScores.length,
  };
}

export function getAdminSummary() {
  const users = Array.from(userScores.values());
  const allScores = users.flatMap((u) => u.scores);
  const averageScore = calcAverage(allScores);
  const totalUsers = userScores.size;
  const totalInterviews = allScores.length;
  const activeUsers = users.filter((u) => getNow() - u.updatedAt < 7 * 24 * 60 * 60 * 1000).length;
  const engagementRate = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;

  return {
    totalUsers,
    totalInterviews,
    averageScore,
    activeUsers,
    engagementRate,
  };
}
