/* Build the deployable folder: node tools/build-dist.js
   Copies only what the site needs (no tests, docs or build tools) and then
   checks that every root-absolute reference actually resolves inside dist. */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const FILES = ["index.html", "404.html", "robots.txt", "sitemap.xml", "_headers", "manifest.webmanifest"];
const DIRS = [
  "css",
  "js",
  "assets",
  "perler-bead-designs",
  "fuse-bead-ideas",
  "fuse-bead-patterns",
  "perler-bead-templates",
  "perler-bead-maker",
  "perler-bead-generator",
  "fuse-bead-pattern-maker",
  "how-to-iron-perler-beads"
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const f of FILES) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) throw new Error("missing " + f);
  fs.copyFileSync(src, path.join(dist, f));
}
for (const d of DIRS) {
  const src = path.join(root, d);
  if (!fs.existsSync(src)) throw new Error("missing " + d);
  fs.cpSync(src, path.join(dist, d), { recursive: true });
}

// resolve every absolute link in the shipped HTML
const htmls = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".html")) htmls.push(p);
  }
})(dist);

const problems = [];
for (const file of htmls) {
  const html = fs.readFileSync(file, "utf8");
  const refs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    const clean = ref.split("#")[0].split("?")[0];
    if (!clean || clean === "/") continue;
    let target = path.join(dist, clean);
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) {
      problems.push(path.relative(dist, file) + " -> " + ref);
    }
  }
}

const bytes = (function size(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? size(p) : fs.statSync(p).size;
  }
  return total;
})(dist);

if (problems.length) {
  console.error("broken references:\n" + problems.join("\n"));
  process.exit(1);
}

console.log(
  "dist ready: " + htmls.length + " pages, " +
  (bytes / 1024).toFixed(0) + " KB, all links resolve"
);
