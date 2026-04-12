import Busboy from "busboy";
import { PDFParse } from "pdf-parse";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ACTION_VERBS = [
  "built",
  "created",
  "designed",
  "delivered",
  "improved",
  "optimized",
  "launched",
  "implemented",
  "owned",
  "shipped",
  "scaled",
  "led",
  "automated",
  "reduced",
  "increased",
  "architected",
  "collaborated",
];

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));

const hashString = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const extractUsername = (rawUrl) => {
  try {
    const { pathname } = new URL(rawUrl);
    const parts = pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch {
    return "";
  }
};

const scoreResume = (text) => {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const metricsCount = (text.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const sections = ["experience", "projects", "skills", "education", "impact"].filter((section) =>
    text.toLowerCase().includes(section),
  ).length;
  const verbHits = ACTION_VERBS.reduce((acc, verb) => {
    const matches = text.toLowerCase().match(new RegExp(`\\b${verb}\\b`, "g"));
    return acc + (matches ? matches.length : 0);
  }, 0);

  const score =
    40 +
    clamp(wordCount / 20, 0, 25) +
    clamp(metricsCount * 2, 0, 15) +
    clamp(verbHits * 1.5, 0, 15) +
    clamp(sections * 3, 0, 12);

  return clamp(score);
};

const scoreGithub = (profile, repos) => {
  const repoCount = repos.length;
  const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const followers = profile.followers || 0;
  const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 90;
  const recentRepos = repos.filter((repo) => new Date(repo.updated_at).getTime() > recentCutoff).length;
  const recentRatio = repoCount ? recentRepos / repoCount : 0;

  const score =
    35 +
    clamp(repoCount * 1.2, 0, 20) +
    clamp(stars / 4, 0, 15) +
    clamp(recentRatio * 20, 0, 15) +
    clamp(followers / 8, 0, 15);

  return clamp(score);
};

const scoreLeetCode = (stats) => {
  const totalSolved = stats.reduce((sum, entry) => sum + (entry.count || 0), 0);
  const hard = stats.find((entry) => entry.difficulty === "Hard")?.count || 0;
  const medium = stats.find((entry) => entry.difficulty === "Medium")?.count || 0;
  const score = 30 + totalSolved * 0.4 + medium * 0.25 + hard * 0.8;
  return clamp(score);
};

const buildAnalysis = ({ resumeScore, githubScore, leetcodeScore, githubUser, leetcodeUser, leetcodeStats }) => {
  const overallScore = clamp((resumeScore + githubScore + leetcodeScore) / 3);

  const roleScores = [
    {
      role: "Frontend Engineer",
      score: clamp(resumeScore * 0.35 + githubScore * 0.45 + leetcodeScore * 0.2),
    },
    {
      role: "Full Stack Engineer",
      score: clamp(resumeScore * 0.3 + githubScore * 0.4 + leetcodeScore * 0.3),
    },
    {
      role: "Backend Engineer",
      score: clamp(resumeScore * 0.25 + githubScore * 0.35 + leetcodeScore * 0.4),
    },
    {
      role: "Product Engineer",
      score: clamp(resumeScore * 0.45 + githubScore * 0.35 + leetcodeScore * 0.2),
    },
  ].sort((a, b) => b.score - a.score);

  const strengths = [];
  if (resumeScore >= 75) strengths.push("Resume narrative is role-aligned");
  if (githubScore >= 75) strengths.push("GitHub activity shows steady momentum");
  if (leetcodeScore >= 70) strengths.push("Consistent LeetCode difficulty coverage");
  while (strengths.length < 4) strengths.push("Clear structure across core sections");

  const weaknesses = [];
  if (resumeScore < 75) weaknesses.push("Resume impact metrics can be stronger");
  if (githubScore < 75) weaknesses.push("GitHub activity needs more depth");
  if (leetcodeScore < 70) weaknesses.push("DSA practice frequency is low");
  while (weaknesses.length < 3) weaknesses.push("Add more evidence of leadership");

  const skillGaps = [
    { skill: "DSA", progress: clamp(leetcodeScore * 0.9) },
    { skill: "Development", progress: clamp(githubScore * 0.9) },
    { skill: "System Design", progress: clamp(resumeScore * 0.78) },
    { skill: "AI/ML", progress: clamp((githubScore + leetcodeScore) * 0.45) },
    { skill: "Problem Solving", progress: clamp(leetcodeScore * 0.88) },
  ];

  const activitySeed = hashString(githubUser || "github");
  const githubActivity = Array.from({ length: 6 }, (_, i) => {
    const commits = clamp((githubScore / 6) + ((activitySeed + i * 13) % 9), 4, 22);
    return { week: `W${i + 1}`, commits };
  });

  const easy = leetcodeStats.find((entry) => entry.difficulty === "Easy")?.count || 0;
  const medium = leetcodeStats.find((entry) => entry.difficulty === "Medium")?.count || 0;
  const hard = leetcodeStats.find((entry) => entry.difficulty === "Hard")?.count || 0;

  return {
    overall_score: overallScore,
    best_roles: roleScores,
    strengths,
    weaknesses,
    skill_gaps: skillGaps,
    github_score: githubScore,
    leetcode_score: leetcodeScore,
    resume_score: resumeScore,
    roadmap: {
      short_term: [
        `Audit ${githubUser || "your"} repos for standout projects`,
        "Refine resume bullets with quantifiable impact",
        `Complete 5 ${leetcodeUser || "LeetCode"} medium problems`,
      ],
      mid_term: [
        "Ship a portfolio case study with metrics",
        "Add tests + CI to flagship project",
        "Mock interviews focused on system design",
      ],
      long_term: [
        "Own an end-to-end feature with stakeholders",
        "Contribute to an open-source project",
        "Target roles aligned to top fit score",
      ],
    },
    github_activity: githubActivity,
    leetcode_breakdown: [
      { level: "Easy", value: easy },
      { level: "Medium", value: medium },
      { level: "Hard", value: hard },
    ],
  };
};

const fetchGitHub = async (githubUrl) => {
  const username = extractUsername(githubUrl);
  if (!username) {
    throw new Error("Invalid GitHub profile URL");
  }

  const headers = {
    "User-Agent": "TechPrep",
    Accept: "application/vnd.github+json",
  };

  const profileRes = await fetch(`https://api.github.com/users/${username}`, { headers });
  if (!profileRes.ok) {
    throw new Error("GitHub profile not found");
  }
  const profile = await profileRes.json();

  const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers });
  const repos = reposRes.ok ? await reposRes.json() : [];

  return { username, profile, repos: Array.isArray(repos) ? repos : [] };
};

const fetchLeetCode = async (leetcodeUrl) => {
  const username = extractUsername(leetcodeUrl);
  if (!username) {
    throw new Error("Invalid LeetCode profile URL");
  }

  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "TechPrep",
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!res.ok) {
    throw new Error("LeetCode profile not found");
  }

  const data = await res.json();
  const stats = data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  return { username, stats: Array.isArray(stats) ? stats : [] };
};

const parseMultipart = (req) =>
  new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: MAX_FILE_BYTES,
      },
    });

    const fields = {};
    let fileBuffer = null;
    let fileInfo = null;

    busboy.on("file", (fieldname, file, info) => {
      if (fieldname !== "resume") {
        file.resume();
        return;
      }

      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("limit", () => reject(new Error("Resume file too large")));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
        fileInfo = info;
      });
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("error", reject);
    busboy.on("finish", () => resolve({ fields, fileBuffer, fileInfo }));

    req.pipe(busboy);
  });

export async function handlePersonalAnalysis(req) {
  const { fields, fileBuffer, fileInfo } = await parseMultipart(req);

  const githubUrl = String(fields.githubUrl || "").trim();
  const leetcodeUrl = String(fields.leetcodeUrl || "").trim();

  if (!fileBuffer || !fileInfo) {
    throw new Error("Resume PDF is required");
  }

  if (!githubUrl || !leetcodeUrl) {
    throw new Error("GitHub and LeetCode links are required");
  }

  if (fileInfo.mimeType !== "application/pdf") {
    throw new Error("Resume must be a PDF file");
  }

  const parser = new PDFParse({ data: fileBuffer });
  let resumeText = "";
  try {
    const parsed = await parser.getText();
    resumeText = parsed.text || "";
  } finally {
    await parser.destroy();
  }
  const resumeScore = scoreResume(resumeText);

  const [{ username: githubUser, profile, repos }, { username: leetcodeUser, stats: leetcodeStats }] = await Promise.all([
    fetchGitHub(githubUrl),
    fetchLeetCode(leetcodeUrl),
  ]);

  const githubScore = scoreGithub(profile, repos);
  const leetcodeScore = scoreLeetCode(leetcodeStats);

  return buildAnalysis({
    resumeScore,
    githubScore,
    leetcodeScore,
    githubUser,
    leetcodeUser,
    leetcodeStats,
  });
}
