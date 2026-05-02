import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const token = process.env.GITHUB_TOKEN;
const owner = "Paganini134";
const repo = "Dashboard_Real";
const branch = "main";

if (!token) {
  throw new Error("GITHUB_TOKEN is required");
}

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "dashboard-real-publisher"
};

async function request(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.message ?? response.statusText;
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${message}`);
  }
  return body;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const commitMessage = git(["log", "-1", "--pretty=%B"]);
const parentSha = git(["rev-parse", "HEAD^{}"]);
const files = git(["ls-tree", "-r", "--name-only", "HEAD"])
  .split("\n")
  .filter(Boolean);

await request(`/repos/${owner}/${repo}`);

let currentRef = null;
try {
  currentRef = await request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
} catch (error) {
  const message = String(error.message);
  if (!message.includes("404") && !message.includes("409 Git Repository is empty")) {
    throw error;
  }
}

if (!currentRef) {
  await request(`/repos/${owner}/${repo}/contents/README.md`, {
    method: "PUT",
    body: JSON.stringify({
      message: "Bootstrap repository",
      content: readFileSync("README.md").toString("base64"),
      branch
    })
  });
  currentRef = await request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
}

const tree = [];
for (const path of files) {
  const content = readFileSync(path).toString("base64");
  const blob = await request(`/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "base64" })
  });
  tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
}

const baseTree = currentRef
  ? (await request(`/repos/${owner}/${repo}/git/commits/${currentRef.object.sha}`)).tree.sha
  : undefined;

const remoteTree = await request(`/repos/${owner}/${repo}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ tree, base_tree: baseTree })
});

const parents = currentRef ? [currentRef.object.sha] : [];
const remoteCommit = await request(`/repos/${owner}/${repo}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: commitMessage,
    tree: remoteTree.sha,
    parents
  })
});

if (currentRef) {
  await request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: remoteCommit.sha, force: false })
  });
} else {
  await request(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: remoteCommit.sha })
  });
}

console.log(`Published ${remoteCommit.sha} to ${owner}/${repo}:${branch}`);
console.log(`Local source commit was ${parentSha}`);
