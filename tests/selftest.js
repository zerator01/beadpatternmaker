/* Node self-test for the pure engine and the generated site.
   Run: node tests/selftest.js */
"use strict";

const path = require("path");
const fs = require("fs");
const assert = require("assert");

const root = path.join(__dirname, "..");
const js = path.join(root, "js");

const BPMPalettes = require(path.join(js, "palettes.js"));
const BPMQuant = require(path.join(js, "quantize.js"));
const BPMRender = require(path.join(js, "render.js"));
global.BPMQuant = BPMQuant;
global.BPMRender = BPMRender;

const BPMPatterns = require(path.join(js, "patterns-data.js"));
const BPMPDF = require(path.join(js, "pdf.js"));
const BPMShare = require(path.join(js, "share.js"));
const BPMFrame = require(path.join(js, "frame.js"));
const Pages = require(path.join(root, "tools", "pages.js"));

function designFile(def, ext) {
  const d = BPMPatterns.dimensions(def);
  return path.join(root, "assets", ext === "pdf" ? "pdfs" : "designs", `${def.slug}-perler-bead-pattern-${d.w}x${d.h}.${ext}`);
}

let checks = 0;
function ok(label, fn) {
  fn();
  checks++;
  console.log("  ok  " + label);
}

function findCode(palette, code) {
  return palette.colors.findIndex((c) => c.code === code);
}

console.log("palettes");
ok("three palettes with unique single-character codes", () => {
  const keys = Object.keys(BPMPalettes.PALETTES);
  assert.deepStrictEqual(keys, ["perler", "hama", "artkal"]);
  for (const key of keys) {
    const palette = BPMPalettes.PALETTES[key];
    assert.strictEqual(palette.colors.length, 26, key + " colour count");
    const codes = palette.colors.map((c) => c.code);
    assert.strictEqual(new Set(codes).size, codes.length, "duplicate code in " + key);
    assert.ok(codes.every((c) => c.length === 1), "single-character codes in " + key);
    for (const colour of palette.colors) {
      assert.match(colour.hex, /^#[0-9A-F]{6}$/i, "bad hex " + colour.hex);
    }
  }
});

ok("all palettes list the same codes in the same order so a chart can switch palette in place", () => {
  const orders = Object.values(BPMPalettes.PALETTES).map((p) => p.colors.map((c) => c.code).join(""));
  assert.strictEqual(new Set(orders).size, 1);
});

console.log("patterns");
ok("every design parses, is rectangular and its counts add up", () => {
  const palette = BPMPalettes.get("perler");
  assert.ok(BPMPatterns.LIST.length >= 25, "at least 25 designs");
  const slugs = new Set();
  for (const def of BPMPatterns.LIST) {
    assert.ok(!slugs.has(def.slug), "duplicate slug " + def.slug);
    slugs.add(def.slug);
    const p = BPMPatterns.toPattern(def, palette);
    const width = def.rows[0].length;
    assert.ok(p.w >= 5 && p.h >= 5, def.slug + " is too small");
    for (const row of def.rows) assert.strictEqual(row.length, width, "row width in " + def.slug);
    let sum = 0;
    for (const count of p.counts) sum += count;
    assert.strictEqual(sum, p.total, def.slug + " counts vs total");
    assert.ok(p.total > 20, def.slug + " is too empty");
    assert.ok(def.theme, def.slug + " has no theme");
  }
});

ok("designs can be remapped to another palette without changing the grid", () => {
  const def = BPMPatterns.find("cat");
  const perler = BPMPatterns.toPattern(def, BPMPalettes.get("perler"));
  const hama = BPMPatterns.toPattern(def, BPMPalettes.get("hama"));
  assert.strictEqual(perler.w, hama.w);
  assert.strictEqual(perler.total, hama.total);
  assert.notStrictEqual(perler.palette.colors[0].hex, hama.palette.colors[0].hex);
});

ok("the gallery has enough theme coverage", () => {
  const themes = new Set(BPMPatterns.LIST.map((d) => d.theme));
  assert.ok(themes.size >= 7, "theme count");
  assert.ok(BPMPatterns.byTheme("animals").length >= 5, "animal designs");
});

console.log("quantise");
ok("pure black maps to the black bead, pure white to white", () => {
  const palette = BPMPalettes.get("perler");
  const px = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
  const p = BPMQuant.quantizeCells(px, 2, 1, palette.colors, {});
  assert.strictEqual(p.cells[0], findCode(palette, "K"));
  assert.strictEqual(p.cells[1], findCode(palette, "W"));
  assert.strictEqual(p.total, 2);
});

ok("transparent cells stay empty", () => {
  const palette = BPMPalettes.get("perler");
  const px = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 0]);
  const p = BPMQuant.quantizeCells(px, 2, 1, palette.colors, {});
  assert.strictEqual(p.cells[1], -1);
  assert.strictEqual(p.total, 1);
});

ok("dithering only emits palette colours and keeps the total", () => {
  const palette = BPMPalettes.get("perler");
  const w = 32, h = 32;
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      px[i] = Math.round((x / w) * 255);
      px[i + 1] = Math.round((y / h) * 255);
      px[i + 2] = 128;
      px[i + 3] = 255;
    }
  }
  const p = BPMQuant.quantizeCells(px, w, h, palette.colors, { dither: true });
  let sum = 0;
  for (const c of p.counts) sum += c;
  assert.strictEqual(sum, w * h);
  assert.strictEqual(p.total, w * h);
  for (let i = 0; i < p.cells.length; i++) {
    assert.ok(p.cells[i] >= 0 && p.cells[i] < palette.colors.length);
  }
});

ok("reduce can drop colours the maker does not own", () => {
  const palette = BPMPalettes.get("perler");
  const p = BPMQuant.patternFromCodes(["RRRRRGGYYBKP"], palette);
  const allowed = new Array(palette.colors.length).fill(false);
  allowed[findCode(palette, "R")] = true;
  allowed[findCode(palette, "G")] = true;
  const reduced = BPMQuant.reduce(p, { allowed: allowed, maxColors: 2 });
  assert.ok(reduced.counts[findCode(palette, "R")] > 0);
  assert.ok(reduced.counts[findCode(palette, "G")] > 0);
  for (let i = 0; i < reduced.counts.length; i++) {
    if (i !== findCode(palette, "R") && i !== findCode(palette, "G")) {
      assert.strictEqual(reduced.counts[i], 0);
    }
  }
});

ok("usedColors is sorted by count and filters empty colours", () => {
  const palette = BPMPalettes.get("perler");
  const p = BPMPatterns.toPattern(BPMPatterns.LIST[0], palette);
  const used = BPMQuant.usedColors(p);
  assert.ok(used.length >= 1);
  assert.strictEqual(used.reduce((a, u) => a + u.count, 0), p.total);
  for (let i = 1; i < used.length; i++) assert.ok(used[i - 1].count >= used[i].count);
  assert.ok(used.every((u) => u.count > 0));
});

console.log("share");
ok("RLE share links round-trip", () => {
  const palette = BPMPalettes.get("perler");
  const p = BPMPatterns.toPattern(BPMPatterns.find("cat"), palette);
  const code = BPMShare.encode(p, "perler");
  const decoded = BPMShare.decode(code);
  assert.ok(decoded, "decoded");
  assert.strictEqual(decoded.w, p.w);
  assert.strictEqual(decoded.h, p.h);
  assert.strictEqual(decoded.paletteKey, "perler");
  const rebuilt = BPMShare.toPattern(decoded, palette);
  assert.strictEqual(rebuilt.total, p.total);
  assert.deepStrictEqual(Array.from(rebuilt.cells), Array.from(p.cells));
});

ok("share decoding rejects malformed data", () => {
  assert.strictEqual(BPMShare.decode("perler.5"), null);
  assert.strictEqual(BPMShare.decode("perler.0.3.AAAA"), null);
  assert.strictEqual(BPMShare.decode("perler.5.3.!!!!"), null);
  assert.strictEqual(BPMShare.decode("perler.2.2.AA"), null);
});

console.log("framing");
ok("crop frame keeps the requested aspect and stays inside the image", () => {
  const r = BPMFrame.rect(1200, 800, 1, { zoom: 1, cx: 0.5, cy: 0.5 });
  assert.ok(Math.abs(r.w / r.h - 1) < 1e-9);
  assert.ok(r.x >= -1e-9 && r.y >= -1e-9);
  assert.ok(r.x + r.w <= 1200 + 1e-9 && r.y + r.h <= 800 + 1e-9);

  const zoomed = BPMFrame.rect(1200, 800, 1, { zoom: 3, cx: 0.2, cy: 0.8 });
  assert.ok(zoomed.w < r.w);
  assert.ok(zoomed.x >= 0 && zoomed.x + zoomed.w <= 1200);
  assert.ok(zoomed.y >= 0 && zoomed.y + zoomed.h <= 800);
});

console.log("PDF");
ok("a pattern PDF has two pages and the expected trailer", () => {
  const palette = BPMPalettes.get("perler");
  const p = BPMPatterns.toPattern(BPMPatterns.find("daisy"), palette);
  const bytes = BPMPDF.build(p, { title: "Daisy", site: "beadpatternmaker.io" });
  const text = Buffer.from(bytes).toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.includes("startxref"));
  assert.ok(text.includes("%%EOF"));
  assert.ok(text.includes("beadpatternmaker.io"));
  assert.ok(text.includes("Bead list"));
  assert.ok(text.includes("/Count 2"));
});

ok("a blank template PDF is one page and does not include a bead list", () => {
  const w = 29, h = 29;
  const pattern = {
    w: w,
    h: h,
    cells: new Int16Array(w * h).fill(0),
    counts: [w * h],
    total: w * h,
    palette: { colors: [{ code: "W", name: "Blank", hex: "#FFFFFF" }] }
  };
  const bytes = BPMPDF.build(pattern, { title: "Blank 29", site: "beadpatternmaker.io", blank: true });
  const text = Buffer.from(bytes).toString("latin1");
  assert.ok(text.includes("Blank pegboard template"));
  assert.ok(text.includes("/Count 1"));
  assert.ok(!text.includes("Bead list"));
});

console.log("built site");
ok("all expected pages and assets exist", () => {
  const pages = [
    "index.html",
    "perler-bead-designs/index.html",
    "fuse-bead-ideas/index.html",
    "fuse-bead-patterns/index.html",
    "perler-bead-templates/index.html",
    "perler-bead-maker/index.html",
    "perler-bead-generator/index.html",
    "fuse-bead-pattern-maker/index.html",
    "how-to-iron-perler-beads/index.html",
    "404.html"
  ];
  for (const page of pages) assert.ok(fs.existsSync(path.join(root, page)), "missing " + page);
  assert.ok(fs.statSync(path.join(root, "assets/og.png")).size > 10_000, "OG image looks empty");
  assert.ok(fs.existsSync(designFile(BPMPatterns.find("cat"), "pdf")));
  assert.ok(fs.existsSync(path.join(root, "assets/templates/perler-bead-template-29x29.pdf")));
  assert.ok(fs.existsSync(path.join(root, "sitemap.xml")));
});

ok("every local absolute asset reference in the built HTML resolves", () => {
  const htmls = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "dist" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".html")) htmls.push(p);
    }
  })(root);
  const problems = [];
  for (const file of htmls) {
    const html = fs.readFileSync(file, "utf8");
    const refs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const ref of refs) {
      const clean = ref.split("#")[0].split("?")[0];
      if (!clean || clean === "/") continue;
      const target = clean.endsWith("/")
        ? path.join(root, clean, "index.html")
        : path.join(root, clean);
      if (!fs.existsSync(target)) problems.push(path.relative(root, file) + " -> " + ref);
    }
  }
  assert.deepStrictEqual(problems, []);
});

ok("every design has a preview, a PDF and its metadata on the design page", () => {
  const html = fs.readFileSync(path.join(root, "perler-bead-designs/index.html"), "utf8");
  for (const def of BPMPatterns.LIST) {
    assert.ok(fs.existsSync(designFile(def, "svg")), "preview " + def.slug);
    assert.ok(fs.existsSync(designFile(def, "pdf")), "pdf " + def.slug);
    assert.ok(html.includes("/?design=" + def.slug), "maker link for " + def.slug);
  }
});

ok("only live pages are in the sitemap, and live pages never link to unlaunched ones", () => {
  const live = Pages.livePages().map((p) => p.path);
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const listed = [...sitemap.matchAll(/<loc>https:\/\/beadpatternmaker\.io(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.deepStrictEqual(listed.sort(), live.slice().sort());
  const hidden = Pages.PAGES.filter((p) => !Pages.isLive(p.path)).map((p) => p.path);
  const files = live.map((p) => path.join(p, "index.html")).concat("404.html");
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    for (const target of hidden) assert.ok(!html.includes(`href="${target}`), file + " links to unlaunched " + target);
  }
});

console.log("\n" + checks + " checks passed");
