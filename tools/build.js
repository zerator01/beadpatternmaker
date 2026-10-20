/* Static site builder for beadpatternmaker.io.
   Run: node tools/build.js
   It writes the HTML pages, pattern previews, printable PDFs, sitemap and the
   social image. No runtime build step is needed for the deployed site. */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.join(__dirname, "..");
const jsDir = path.join(root, "js");

const BPMPalettes = require(path.join(jsDir, "palettes.js"));
const BPMPatterns = require(path.join(jsDir, "patterns-data.js"));
global.BPMQuant = require(path.join(jsDir, "quantize.js"));
global.BPMRender = require(path.join(jsDir, "render.js"));
const BPMPDF = require(path.join(jsDir, "pdf.js"));
const Pages = require(path.join(__dirname, "pages.js"));

const SITE = "https://beadpatternmaker.io";
const BRAND = "beadpatternmaker";
const YEAR = "2026";
const UPDATED = "2026-10-20";
const PERLER = BPMPalettes.get("perler");
const DESIGN_COUNT = BPMPatterns.LIST.length;

// ---------------------------------------------------------------------------
// tiny helpers
// ---------------------------------------------------------------------------

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attr(value) {
  return esc(value).replace(/'/g, "&#39;");
}

function write(rel, contents) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function kb(bytes) {
  return (bytes / 1024).toFixed(0) + " KB";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function patternFor(def) {
  return BPMPatterns.toPattern(def, PERLER);
}

function patternMeta(def) {
  const p = patternFor(def);
  const colors = p.counts.filter(function (n) { return n > 0; }).length;
  return { w: p.w, h: p.h, total: p.total, colors: colors };
}

function plural(n, one, many) {
  return n + " " + (n === 1 ? one : (many || one + "s"));
}

function themeLabel(def) {
  return BPMPatterns.THEME_LABELS[def.theme] || def.theme;
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Asset file names carry the subject, the keyword and the grid size, e.g.
// /assets/designs/cat-perler-bead-pattern-15x13.svg
function designFile(def, ext) {
  const d = BPMPatterns.dimensions(def);
  const dir = ext === "pdf" ? "pdfs" : "designs";
  return `/assets/${dir}/${def.slug}-perler-bead-pattern-${d.w}x${d.h}.${ext}`;
}

function templateFile(t, ext) {
  return `/assets/templates/perler-bead-template-${t.w}x${t.h}.${ext}`;
}

// Gallery cards open in the /perler-bead-maker/ tool page once it is live.
// Until then, and on the homepage itself, they open in the homepage tool.
function designHref(def, onHome) {
  const base = !onHome && Pages.isLive("/perler-bead-maker/") ? "/perler-bead-maker/" : "/";
  return base + "?design=" + encodeURIComponent(def.slug);
}

// ---------------------------------------------------------------------------
// shared chrome
// ---------------------------------------------------------------------------

const NAV = [
  { href: "/", label: "Maker", key: "home" },
  { href: "/perler-bead-designs/", label: "Designs", key: "designs" },
  { href: "/fuse-bead-ideas/", label: "Ideas", key: "ideas" },
  { href: "/fuse-bead-patterns/", label: "Patterns", key: "patterns" },
  { href: "/perler-bead-templates/", label: "Templates", key: "templates" },
  { href: "/how-to-iron-perler-beads/", label: "How to iron", key: "iron" }
].filter(function (item) { return Pages.isLive(item.href); });

const FOOTER_COLUMNS = [
  {
    title: "Make",
    links: [
      ["/", "Pattern maker"],
      ["/perler-bead-maker/", "Perler bead maker"],
      ["/perler-bead-generator/", "Perler bead generator"],
      ["/fuse-bead-pattern-maker/", "Fuse bead pattern maker"]
    ]
  },
  {
    title: "Browse",
    links: [
      ["/perler-bead-designs/", "Perler bead designs"],
      ["/fuse-bead-ideas/", "Fuse bead ideas"],
      ["/fuse-bead-patterns/", "Fuse bead patterns"],
      ["/perler-bead-templates/", "Printable templates"]
    ]
  },
  {
    title: "Learn",
    links: [
      ["/how-to-iron-perler-beads/", "How to iron perler beads"],
      ["/how-to-iron-perler-beads/#troubleshooting", "Ironing troubleshooting"],
      ["/perler-bead-designs/#sizes", "Pattern size guide"],
      ["/fuse-bead-patterns/#reading", "How to read a chart"]
    ]
  }
];

function brandMark() {
  const beads = { 2: "#2747e8", 6: "#d8ff3e", 8: "#ff4f9a", 11: "#2fd3e2", 15: "#2747e8", 18: "#ff4f9a", 22: "#d8ff3e" };
  let cells = "";
  for (let i = 0; i < 25; i++) {
    const colour = beads[i];
    cells += colour
      ? `<i class="is-bead" style="--b:${colour}"></i>`
      : "<i></i>";
  }
  return `<span class="brand-mark" aria-hidden="true">${cells}</span>`;
}

function head(opts) {
  const canonical = SITE + (opts.path === "/" ? "/" : opts.path);
  const image = SITE + (opts.image || "/assets/og.png");
  const schema = opts.schema
    ? `<script type="application/ld+json">${JSON.stringify(opts.schema).replace(/</g, "\\u003c")}</script>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${attr(opts.desc)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#f2f5f7">
<meta name="color-scheme" content="light">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="${opts.ogType || "website"}">
<meta property="og:site_name" content="Bead Pattern Maker">
<meta property="og:title" content="${attr(opts.ogTitle || opts.title)}">
<meta property="og:description" content="${attr(opts.ogDesc || opts.desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(opts.ogTitle || opts.title)}">
<meta name="twitter:description" content="${attr(opts.ogDesc || opts.desc)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
${schema}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(opts.active)}
`;
}

function header(active) {
  const links = NAV.map(function (item) {
    return `<a href="${item.href}"${item.key === active ? ' aria-current="page"' : ""}>${item.label}</a>`;
  }).join("\n      ");
  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/" aria-label="Bead Pattern Maker home">
      ${brandMark()}
      <span class="brand-name">${BRAND}<span>.io</span></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${links}
    </nav>
    <a class="header-cta" href="/#tool">Open maker <span>↗</span></a>
  </div>
</header>`;
}

function footerColumns() {
  return FOOTER_COLUMNS.map(function (col) {
    const links = col.links.filter(function (link) { return Pages.isLive(link[0]); });
    if (!links.length) return "";
    return `<div>
          <h4>${esc(col.title)}</h4>
          <ul>
            ${links.map(function (link) { return `<li><a href="${link[0]}">${esc(link[1])}</a></li>`; }).join("\n            ")}
          </ul>
        </div>`;
  }).filter(Boolean).join("\n        ");
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-about">
        <a class="brand" href="/" aria-label="Bead Pattern Maker home">
          ${brandMark()}
          <span class="brand-name">${BRAND}<span>.io</span></span>
        </a>
        <p>A free photo-to-pattern tool for perler and fuse beads. Coded charts, exact bead counts and printable PDFs, made in the browser.</p>
        <p class="footer-kicker">Ready when you are</p>
        <a class="footer-link" href="/#tool">Open the workbench <span>→</span></a>
      </div>
      <div class="footer-grid">
        ${footerColumns()}
      </div>
    </div>
    <div class="footer-bottom">
      <p>© ${YEAR} ${BRAND}.io — made for people who keep a jar of beads on the desk.</p>
      <p>Not affiliated with Perler, Hama, Artkal or any bead manufacturer. Colour values are screen approximations.</p>
    </div>
  </div>
</footer>`;
}

function scripts(opts) {
  const list = ["/js/site.js"];
  if (opts && opts.gallery) list.push("/js/patterns-data.js", "/js/gallery.js");
  if (opts && opts.tool) {
    list.push(
      "/js/palettes.js",
      "/js/quantize.js",
      "/js/render.js",
      "/js/pdf.js",
      "/js/share.js",
      "/js/frame.js",
      "/js/patterns-data.js",
      "/js/app.js"
    );
  }
  return list.map(function (src) { return `<script src="${src}"></script>`; }).join("\n");
}

// ---------------------------------------------------------------------------
// tool markup
// ---------------------------------------------------------------------------

const ROWS_OPTIONS = [
  ["square", "Square"],
  ["auto", "Photo ratio"],
  ["16", "16 rows"],
  ["29", "29 rows"],
  ["48", "48 rows"],
  ["64", "64 rows"]
];

function toolMarkup(cfg) {
  const palettes = Object.keys(BPMPalettes.PALETTES).map(function (key) {
    const p = BPMPalettes.PALETTES[key];
    return `<option value="${key}"${key === cfg.palette ? " selected" : ""}>${esc(p.label)}</option>`;
  }).join("");
  const rows = ROWS_OPTIONS.map(function (pair) {
    return `<option value="${pair[0]}"${pair[0] === cfg.rows ? " selected" : ""}>${pair[1]}</option>`;
  }).join("");
  return `<div class="wrap" id="tool">
  <div class="workbench">
    <div class="workbench-head">
      <div class="wb-heading">
        <span class="mono">WORKBENCH / 01</span>
        <h2>Pattern board</h2>
      </div>
      <div class="wb-quick">
        <button class="btn btn--small" type="button" id="sample">Load sample</button>
        <button class="btn btn--small btn--quiet" type="button" id="reset" disabled>Reset</button>
      </div>
      <div class="wb-export">
        <button class="btn btn--small btn--primary" type="button" id="dlPdf" disabled>Export PDF</button>
        <button class="btn btn--small btn--quiet" type="button" id="dlPng" disabled>PNG</button>
        <button class="btn btn--small btn--quiet" type="button" id="dlCsv" disabled>CSV</button>
      </div>
    </div>

    <div class="workbench-grid">
      <aside class="wb-rail">
        <div class="rail-head mono">TOOLS</div>
        <div class="editor-bar" id="editorBar" hidden>
          <div class="tool-group" role="group" aria-label="Edit tool">
            <button type="button" data-tool="paint" aria-pressed="true" title="Paint (P)">Paint</button>
            <button type="button" data-tool="erase" aria-pressed="false" title="Erase (E)">Erase</button>
            <button type="button" data-tool="pick" aria-pressed="false" title="Pick a colour (I)">Pick</button>
          </div>
          <div class="tool-group" role="group" aria-label="History">
            <button type="button" id="undo" disabled title="Undo (Cmd+Z)">Undo</button>
            <button type="button" id="redo" disabled title="Redo (Shift+Cmd+Z)">Redo</button>
          </div>
          <div class="swatch-strip" id="paletteStrip" role="group" aria-label="Active bead colour"></div>
        </div>
        <div class="rail-empty">
          <span class="mono">NO BOARD</span>
          <p>Load a sample or drop a photo to unlock the paint tools.</p>
        </div>
        <div class="rail-shortcuts" aria-label="Keyboard shortcuts">
          <span><kbd>P</kbd> paint</span>
          <span><kbd>E</kbd> erase</span>
          <span><kbd>I</kbd> pick</span>
          <span><kbd>⌘Z</kbd> undo</span>
        </div>
      </aside>

      <div class="wb-stage">
        <div class="stage-head">
          <span>SURFACE / PEGBOARD</span>
          <span class="surface-live">5 MM GRID · <span class="stage-code">LOCAL</span></span>
        </div>
        <div class="preview-shell">
          <canvas id="preview" width="600" height="380" aria-label="Bead pattern preview"></canvas>
          <button type="button" class="preview-empty" id="emptyState">
            <span class="empty-kicker">BOARD EMPTY / READY</span>
            <span class="empty-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
            <strong>Drop a photo to begin</strong>
            <span>or load the sample — no upload, no account</span>
          </button>
        </div>
        <div class="stage-stats">
          <div class="stats" id="stats" hidden></div>
          <div class="legend" id="legend" hidden></div>
        </div>
      </div>

      <aside class="wb-inspector">
        <div class="inspector-block">
          <div class="inspector-head"><span>01 / SOURCE</span><span class="accent">LOCAL ONLY</span></div>
          <label class="dropzone" id="drop" for="file" tabindex="0">
            <input type="file" id="file" accept="image/*" hidden>
            <span class="drop-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>
              </svg>
            </span>
            <strong>Drop a photo</strong>
            <span>JPG / PNG / WEBP · click or paste</span>
            <span class="file-name" id="fileName">nothing loaded</span>
          </label>
          <p class="hint">One clear subject and a plain background convert cleanest. The photo is read in your browser and never sent anywhere.</p>
        </div>

        <div class="inspector-block">
          <div class="inspector-head"><span>02 / GRID</span><span>5 MM MIDI</span></div>
          <label class="field">
            <span>Pattern width <b><span id="widthVal">${cfg.cols}</span> beads</b></span>
            <input type="range" id="width" min="12" max="80" step="1" value="${cfg.cols}">
          </label>
          <div class="field-row two">
            <label class="field">
              <span>Height</span>
              <select id="rows">${rows}</select>
            </label>
            <label class="field">
              <span>Palette</span>
              <select id="palette">${palettes}</select>
            </label>
          </div>
          <label class="field">
            <span>Max colours <b><span id="maxColorsVal">${cfg.maxColors}</span></b></span>
            <input type="range" id="maxColors" min="2" max="26" step="1" value="${cfg.maxColors}">
          </label>
          <label class="check">
            <input type="checkbox" id="dither">
            Soften gradients (dithering)
          </label>
          <label class="check">
            <input type="checkbox" id="dropBg">
            Remove a plain background
          </label>
        </div>

        <details class="panel" id="cropPanel" hidden>
          <summary>Frame the photo</summary>
          <div class="panel-body">
            <div class="crop-stage">
              <canvas id="cropCanvas" width="560" height="360" aria-label="Crop preview"></canvas>
            </div>
            <label class="field">
              <span>Zoom <b><span id="cropZoomVal">1.0</span>×</b></span>
              <input type="range" id="cropZoom" min="1" max="5" step="0.1" value="1">
            </label>
            <div class="crop-actions">
              <button type="button" class="btn btn--small" id="cropCenter">Centre</button>
              <button type="button" class="btn btn--small" id="cropReset">Reset frame</button>
            </div>
            <p class="hint" style="border:0;padding:0">Drag the frame to choose what lands on the pegboard. The chart updates as you move it.</p>
          </div>
        </details>

        <details class="panel">
          <summary>Only use beads I own</summary>
          <div class="panel-body">
            <div class="swatch-grid" id="stash" role="group" aria-label="Beads I own"></div>
            <p class="hint" style="border:0;padding:0">Tap a bead to turn it off. The chart reroutes to the nearest colour left on.</p>
          </div>
        </details>

        <div class="inspector-block inspector-output">
          <div class="inspector-head"><span>03 / OUTPUT</span><span>PRINT / SAVE</span></div>
          <label class="check check--small actual-size">
            <input type="checkbox" id="actualSize">
            Print at actual bead size (5 mm cells)
          </label>
          <div class="export-row">
            <button class="btn btn--small btn--quiet" type="button" id="shareLink" disabled>Copy share link</button>
          </div>
          <p id="status" class="tool-status" role="status" aria-live="polite">No board loaded. Start with a photo or the sample.</p>
        </div>
      </aside>
    </div>

    <div class="workbench-foot">
      <span>NO UPLOAD / LOCAL PROCESSING / 26 COLOURS PER PALETTE</span>
      <span>A4 PDF · PNG · CSV</span>
    </div>
  </div>
</div>`;
}

function toolConfigScript(cfg) {
  return `<script>window.BPM_TOOL = ${JSON.stringify(cfg)};</script>`;
}

// ---------------------------------------------------------------------------
// SVG assets
// ---------------------------------------------------------------------------

function svgShell(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640" role="img" aria-labelledby="title">
<title id="title">${esc(title)}</title>
${body}
</svg>
`;
}

function patternSvg(def) {
  const p = patternFor(def);
  const colors = p.palette.colors;
  const board = 548;
  const origin = 46;
  const scale = Math.min(board / p.w, board / p.h);
  const ox = (640 - p.w * scale) / 2;
  const oy = (640 - p.h * scale) / 2;
  const r = scale * 0.44;
  const hole = Math.max(1.4, scale * 0.15);
  const stroke = Math.max(0.7, scale * 0.035);
  let beads = "";
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const idx = p.cells[y * p.w + x];
      if (idx < 0) continue;
      const cx = ox + (x + 0.5) * scale;
      const cy = oy + (y + 0.5) * scale;
      beads += `<circle cx="${(cx + 0.7).toFixed(2)}" cy="${(cy + 0.9).toFixed(2)}" r="${r.toFixed(2)}" fill="#101418" fill-opacity=".12"/>`;
      beads += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${colors[idx].hex}" stroke="#101418" stroke-opacity=".38" stroke-width="${stroke.toFixed(2)}"/>`;
      beads += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${hole.toFixed(2)}" fill="#f7fafb" stroke="#101418" stroke-opacity=".24" stroke-width="${Math.max(0.4, stroke * 0.7).toFixed(2)}"/>`;
    }
  }
  return svgShell(
    def.name + " perler bead design",
    `<defs>
  <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1.25" fill="#101418" fill-opacity=".09"/>
  </pattern>
</defs>
<rect width="640" height="640" fill="#e8eef2"/>
<rect width="640" height="640" fill="url(#dots)"/>
<rect x="30" y="30" width="580" height="580" rx="0" fill="#f7fafb" stroke="#101418" stroke-opacity=".16" stroke-width="2"/>
<g>${beads}</g>`
  );
}

function templateSvg(t) {
  const w = t.w;
  const h = t.h;
  const margin = 48;
  const area = 640 - margin * 2;
  const scale = Math.min(area / w, area / h);
  const ox = (640 - w * scale) / 2;
  const oy = (640 - h * scale) / 2;
  let lines = "";
  for (let x = 0; x <= w; x++) {
    const px = ox + x * scale;
    const strong = x % 5 === 0;
    lines += `<line x1="${px.toFixed(2)}" y1="${(oy).toFixed(2)}" x2="${px.toFixed(2)}" y2="${(oy + h * scale).toFixed(2)}" stroke="${strong ? "#81909a" : "#c1ccd4"}" stroke-width="${strong ? 1.5 : 0.8}" stroke-opacity="${strong ? ".75" : ".55"}"/>`;
  }
  for (let y = 0; y <= h; y++) {
    const py = oy + y * scale;
    const strong = y % 5 === 0;
    lines += `<line x1="${(ox).toFixed(2)}" y1="${py.toFixed(2)}" x2="${(ox + w * scale).toFixed(2)}" y2="${py.toFixed(2)}" stroke="${strong ? "#81909a" : "#c1ccd4"}" stroke-width="${strong ? 1.5 : 0.8}" stroke-opacity="${strong ? ".75" : ".55"}"/>`;
  }
  let labels = "";
  if (scale >= 11) {
    for (let x = 5; x < w; x += 5) {
      labels += `<text x="${(ox + x * scale).toFixed(1)}" y="${(oy - 7).toFixed(1)}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="9" fill="#6f7a84">${x}</text>`;
    }
    for (let y = 5; y < h; y += 5) {
      labels += `<text x="${(ox - 8).toFixed(1)}" y="${(oy + y * scale + 3).toFixed(1)}" text-anchor="end" font-family="ui-monospace, Menlo, monospace" font-size="9" fill="#6f7a84">${y}</text>`;
    }
  }
  return svgShell(
    t.name + " blank perler bead template",
    `<rect width="640" height="640" fill="#e8eef2"/>
<rect x="30" y="30" width="580" height="580" rx="0" fill="#ffffff" stroke="#101418" stroke-opacity=".16" stroke-width="2"/>
<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${(w * scale).toFixed(2)}" height="${(h * scale).toFixed(2)}" fill="#fff" stroke="#101418" stroke-width="1.6"/>
<g>${lines}</g>
<g>${labels}</g>`
  );
}

// ---------------------------------------------------------------------------
// PNG encoder for the social card and touch icon
// ---------------------------------------------------------------------------

const CRC_TABLE = (function () {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(width, height, paint) {
  const data = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    data[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const c = paint(x, y);
      const i = y * (width * 4 + 1) + 1 + x * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = c.length > 3 ? c[3] : 255;
    }
  }
  const raw = zlib.deflateSync(data, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", raw),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function hexRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blend(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function socialCard() {
  const w = 1200, h = 630;
  const paper = hexRgb("#f2f5f7");
  const cream = hexRgb("#ffffff");
  const ink = hexRgb("#101418");
  const palette = [hexRgb("#2747e8"), hexRgb("#d8ff3e"), hexRgb("#ff4f9a"), hexRgb("#2fd3e2"), hexRgb("#ffffff"), hexRgb("#ff7b3d")];
  const pattern = patternFor(BPMPatterns.find("daisy"));
  const scale = 30;
  const pw = pattern.w * scale;
  const ph = pattern.h * scale;
  const ox = 860 - pw / 2;
  const oy = 315 - ph / 2;
  const radius = scale * 0.43;

  return png(w, h, function (x, y) {
    // paper background with a faint dot grid
    let c = paper.slice();
    if ((x % 28 < 2) && (y % 28 < 2)) c = blend(c, ink, 0.07);

    // card panel
    if (x > 60 && x < 1140 && y > 55 && y < 575) {
      c = cream.slice();
      if (x < 66 || x > 1134 || y < 61 || y > 569) c = ink.slice();
    }

    // left colour blocks (abstract wordmark)
    const bx = 120, by = 150;
    if (x > bx && x < bx + 430 && y > by && y < by + 54) c = ink.slice();
    if (x > bx && x < bx + 330 && y > by + 88 && y < by + 132) c = ink.slice();
    if (x > bx && x < bx + 90 && y > by + 190 && y < by + 280) {
      const ix = Math.floor((x - bx) / 30), iy = Math.floor((y - by - 190) / 30);
      c = palette[(ix + iy) % palette.length];
    }
    if (x > bx + 120 && x < bx + 410 && y > by + 205 && y < by + 228) c = ink.slice();
    if (x > bx + 120 && x < bx + 350 && y > by + 246 && y < by + 266) c = blend(ink, cream, 0.35);

    // daisy pattern on the right
    if (x > ox && x < ox + pw && y > oy && y < oy + ph) {
      const cx = Math.floor((x - ox) / scale);
      const cy = Math.floor((y - oy) / scale);
      const idx = pattern.cells[cy * pattern.w + cx];
      if (idx >= 0) {
        const cxp = ox + (cx + 0.5) * scale;
        const cyp = oy + (cy + 0.5) * scale;
        const d = Math.hypot(x - cxp, y - cyp);
        if (d <= radius) {
          const fill = hexRgb(pattern.palette.colors[idx].hex);
          c = fill.slice();
          if (d < radius * 0.17) c = cream.slice();
          else if (d > radius - 2) c = blend(fill, ink, 0.3);
        }
      }
    }
    return c;
  });
}

// ---------------------------------------------------------------------------
// cards and galleries
// ---------------------------------------------------------------------------

// opts.home: the card sits on the homepage. opts.action "pdf": PDF first.
// opts.text "idea": show the finishing idea instead of the description.
function designCard(def, opts) {
  opts = opts || {};
  const meta = patternMeta(def);
  const alt = `${def.name} perler bead design in a ${meta.w} by ${meta.h} grid using ${plural(meta.colors, "colour")}`;
  const pdf = designFile(def, "pdf");
  const make = `<a class="btn ${opts.action === "pdf" ? "btn--ghost" : "btn--primary"} btn--wide" href="${designHref(def, opts.home)}">Make this pattern</a>`;
  const action = opts.action === "pdf"
    ? `<a class="btn btn--primary" href="${pdf}" download>PDF</a>${make}`
    : `${make}<a class="btn btn--ghost" href="${pdf}" download>PDF</a>`;
  return `<article class="pattern-card" data-tag="${attr(def.theme)}">
  <div class="plate-top"><span class="plate-theme">${esc(themeLabel(def))}</span><span>${meta.w} × ${meta.h}</span></div>
  <div class="thumb"><img src="${designFile(def, "svg")}" alt="${attr(alt)}" loading="lazy" width="640" height="640"></div>
  <div class="meta">
    <h3>${esc(def.name)}</h3>
    <p>${esc(opts.text === "idea" ? def.idea : def.description)}</p>
    <div class="meta-row">
      <span>${plural(meta.colors, "colour")}</span>
      <span>${meta.total} beads</span>
      <span>${esc(def.difficulty)}</span>
    </div>
    <div class="card-actions">${action}</div>
  </div>
</article>`;
}

function filterBar() {
  return `<div class="filter-bar" data-filter-bar role="group" aria-label="Filter designs by theme">
  <span class="filter-label">Filter</span>
  ${BPMPatterns.THEMES.map(function (t, i) {
    return `<button type="button" data-filter="${t.id}" aria-pressed="${i === 0 ? "true" : "false"}">${esc(t.label)}</button>`;
  }).join("\n  ")}
</div>
<p class="gallery-count" data-gallery-count><b>${BPMPatterns.LIST.length}</b> designs</p>`;
}

function templateCard(t) {
  return `<article class="template-card">
  <div class="plate-top"><span class="plate-theme">TEMPLATE</span><span>${t.w} × ${t.h}</span></div>
  <img src="${templateFile(t, "svg")}" alt="${attr(t.name + " blank perler bead template with grid lines")}" loading="lazy" width="640" height="640">
  <div class="meta">
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.note)}</p>
    <a class="btn btn--small" href="${templateFile(t, "pdf")}" download>Download PDF</a>
  </div>
</article>`;
}

// ---------------------------------------------------------------------------
// frequently used copy
// ---------------------------------------------------------------------------

const FAQ_HOME = [
  {
    q: "Is this perler bead pattern maker free?",
    a: "Yes. The maker, the coded chart, the bead counts, the PNG and the print-ready PDF are free, with no account and no watermark. The photo is processed in your browser and is never uploaded to a server."
  },
  {
    q: "What kind of photo makes the best perler bead pattern?",
    a: "Simple, high-contrast images with one clear subject work best. Crop close to the subject, avoid busy backgrounds, and choose a grid size that leaves enough cells for the details you care about. Fewer cells usually makes a bolder, more readable piece."
  },
  {
    q: "Which bead palettes can I use?",
    a: "The maker includes Perler-style, Hama-style and Artkal-style palettes. Switch palettes before you export and the chart is remapped to the nearest colour in that set. Colour values are screen approximations, so compare a real bead with the swatch before a large project."
  },
  {
    q: "How many beads will my pattern need?",
    a: "The chart counts every filled cell and breaks the total down by colour. The same list is on the last page of the PDF and can be downloaded as a CSV, so you can check it against the beads already in your stash."
  },
  {
    q: "How do I print the pattern?",
    a: "Download the PDF and print at 100% on A4 or Letter paper. Large grids are tiled across several sheets with the column and row range printed on each one. Every fifth line is heavier so you can count rows without losing your place."
  },
  {
    q: "Can I edit the pattern after it is generated?",
    a: "Yes. Click any bead to paint it, erase it, or pick up its colour. Undo and redo cover every stroke, and the bead counts update as you edit. That matters most around eyes, outlines and small details where an automatic conversion needs a correction."
  }
];

function faq(items) {
  return `<div class="faq">
  ${items.map(function (item, i) {
    return `<details${i === 0 ? " open" : ""}>
    <summary>${esc(item.q)}</summary>
    <div class="answer">${item.a}</div>
  </details>`;
  }).join("\n  ")}
</div>`;
}

function faqSchema(items) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map(function (item) {
      return {
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a.replace(/<[^>]+>/g, "") }
      };
    })
  };
}

function breadcrumb(items) {
  return `<p class="crumb">${items.map(function (item, i) {
    const bit = item.href ? `<a href="${item.href}">${esc(item.label)}</a>` : esc(item.label);
    return (i ? "<span>/</span>" : "") + bit;
  }).join("")}</p>`;
}

function ctaBand(title, text, href, label) {
  return `<section class="section">
  <div class="wrap">
    <div class="cta-band">
      <div>
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
      </div>
      <a class="btn btn--primary" href="${href}">${esc(label)}</a>
    </div>
  </div>
</section>`;
}

const CONTENT_PAGES = ["designs", "ideas", "patterns", "templates", "iron"];

// End-of-page links: this page's sentence linking back to the homepage, then
// the other live content pages with their target keyword as the anchor.
function keepGoing(key) {
  const self = Pages.page(key);
  const intro = self.home
    ? esc(self.home).replace(/\{([^}]+)\}/, '<a href="/">$1</a>')
    : "Every design here is free, comes with an exact bead count and opens straight in the maker.";
  const others = CONTENT_PAGES
    .filter(function (k) { return k !== key && Pages.isLive(Pages.page(k).path); })
    .map(Pages.page);
  return `<section class="section section--tight">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow-line">Keep going</p>
      <h2>Find your next pattern</h2>
      <p>${intro}</p>
    </div>${others.length ? `
    <div class="callout-grid callout-grid--fit">
      ${others.map(function (p) {
        return `<article class="callout-card">
        <h3><a href="${p.path}">${esc(capitalise(p.keyword))}</a></h3>
        <p>${esc(p.blurb)}</p>
      </article>`;
      }).join("\n      ")}
    </div>` : ""}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// page renderers
// ---------------------------------------------------------------------------

function homePage() {
  const featured = ["daisy", "cat", "mushroom", "rocket", "rainbow", "smiley"].map(BPMPatterns.find);
  const catImg = designFile(BPMPatterns.find("cat"), "svg");
  const sizeLinks = `<a href="/perler-bead-designs/#sizes">See the full pattern size guide</a>` +
    (Pages.isLive("/fuse-bead-patterns/") ? ` or browse the <a href="/fuse-bead-patterns/">printable fuse bead patterns</a>` : "") + ".";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Bead Pattern Maker",
        url: SITE + "/",
        applicationCategory: "DesignApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        description: "Free photo to perler bead pattern converter with colour codes, bead counts and printable PDF export.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Photo to perler bead pattern conversion",
          "Perler, Hama and Artkal palettes",
          "Click-to-edit chart with undo",
          "Bead counts per colour",
          "Print-ready A4 PDF",
          "PNG, CSV and share links"
        ]
      },
      faqSchema(FAQ_HOME)
    ]
  };
  return head({
    title: "Perler Bead Pattern Maker – Free Online Tool",
    desc: "Turn a photo into a perler bead pattern with a colour code in every cell, exact bead counts and a print-ready PDF. Free, no account, no upload.",
    path: "/",
    active: "home",
    ogTitle: "Perler bead pattern maker — photo to printable pattern",
    ogDesc: "Upload a photo, get a coded perler bead chart, bead counts and a print-ready PDF. Free and private.",
    schema: schema
  }) + `<main id="main">
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">Perler / fuse beads · 5 mm</p>
          <h1>Perler bead<br>pattern maker<span class="title-dot">.</span></h1>
          <p class="lede">Upload a photo and get a coded pegboard chart back: every cell labelled with its bead colour, an exact count for each colour, and a print-ready PDF. Then click any bead to fix what the camera got wrong — before you pick up the tweezers.</p>
          <div class="hero-actions">
            <a class="btn btn--primary" href="#tool">Start with a photo</a>
            <a class="btn" href="/perler-bead-designs/">Browse designs</a>
          </div>
          <dl class="hero-specs">
            <div><dt>Grid</dt><dd>12–80 beads</dd></div>
            <div><dt>Palettes</dt><dd>03 / 26 each</dd></div>
            <div><dt>Output</dt><dd>PDF · PNG · CSV</dd></div>
          </dl>
        </div>
        <div class="hero-board">
          <div class="board-top"><span>SPECIMEN / 015</span><span>15 × 13</span></div>
          <img src="${catImg}" alt="Little cat perler bead design in a 15 by 13 grid using 3 colours" width="640" height="640">
          <div class="board-bottom"><span>LITTLE CAT / 3 COLOURS</span><strong>97 BEADS</strong></div>
        </div>
      </div>
    </div>
  </section>

  ${toolMarkup({ cols: 32, rows: "square", palette: "perler", maxColors: 18 })}

  <section class="section section--tight">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">How it works</p>
        <h2>Four steps, about a minute</h2>
        <p>No upload queue, no account, and no watermark on the export.</p>
      </div>
      <div class="steps">
        <div class="step">
          <h3>Drop in a photo</h3>
          <p>JPG, PNG or WEBP — you can paste straight from the clipboard too. One clear subject and a plain background convert best.</p>
        </div>
        <div class="step">
          <h3>Choose the grid</h3>
          <p>Use 29 × 29 for a standard square pegboard, or go bigger for a wall piece. Match the photo or lock the grid square.</p>
        </div>
        <div class="step">
          <h3>Fix any bead</h3>
          <p>Paint, erase or pick colours straight on the chart. Undo is one keystroke and the bead counts update as you go.</p>
        </div>
        <div class="step">
          <h3>Print and place</h3>
          <p>The PDF has a colour code in every cell, a heavier line every five beads, and a final page listing how many of each colour to pull.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap export-preview">
      <div class="export-stack" aria-hidden="true">
        <div class="export-sheet export-sheet--back"></div>
        <div class="export-sheet">
          <img src="${catImg}" alt="" width="640" height="640">
          <div class="sheet-caption">CAT · 15 × 13 · 97 BEADS</div>
          <div class="sheet-rule"></div>
          <div class="sheet-line"></div>
          <div class="sheet-line short"></div>
        </div>
      </div>
      <div>
        <p class="eyebrow-line">The export</p>
        <h2>The part most pattern makers skip: the bead list</h2>
        <p>A chart tells you where the beads go. It does not tell you that you need 47 white, 31 pink and 9 yellow before you sit down — so you find out halfway through a piece.</p>
        <p>Every pattern you make here ships with a count per colour, sorted by how many you need. The PDF puts it on its own page so you can take it to the craft shop, and the CSV export lets you check the list against the beads already in your stash.</p>
        <p class="note">Colour values are screen approximations. Bead batches vary, so always eyeball a few of your own beads against the swatches before you commit to a big piece.</p>
      </div>
    </div>
  </section>

  <section class="section band">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Built for real pegboards</p>
        <h2>Made around a 5 mm bead, not a pixel</h2>
        <p>Perler midi beads are not pixels. The defaults assume a 5 mm bead on a square pegboard, and the chart stays editable until it is right.</p>
      </div>
      <div class="features">
        <article class="feature feature--lead">
          <div class="feature-copy">
            <div class="ico" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </div>
            <h3>Fix any bead</h3>
            <p>Paint, erase or pick a colour straight on the chart. Undo with ⌘Z, redo with ⇧⌘Z, and the bead counts stay live while you work.</p>
          </div>
          <div class="feature-chart">
            <img src="${designFile(BPMPatterns.find("rainbow"), "svg")}" alt="Rainbow fuse bead design in a 15 by 11 grid using 4 colours" width="640" height="640">
          </div>
        </article>

        <article class="feature">
          <div class="ico" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <h3>Codes, not guesswork</h3>
          <p>Every cell carries its palette code, so you never have to decide between two similar pinks by eye.</p>
          <p class="code-chips" aria-hidden="true">
            <span style="--c:#202020;color:#fff">K</span>
            <span style="--c:#d92b2b;color:#fff">R</span>
            <span style="--c:#f5ce42">Y</span>
            <span style="--c:#2e6fdc;color:#fff">B</span>
            <span style="--c:#f6f3ea">W</span>
            <span style="--c:#e86293;color:#fff">M</span>
          </p>
        </article>

        <article class="feature">
          <div class="ico" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h16v12H4z"/><path d="M4 8l2-4h12l2 4"/><path d="M9 12h6"/></svg>
          </div>
          <h3>Only the beads you own</h3>
          <p>Turn off beads you do not have and the pattern reroutes to the nearest colour left. No more charts you cannot build.</p>
        </article>

        <article class="feature">
          <div class="ico" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="4 3"/><path d="m9 15 6-6"/></svg>
          </div>
          <h3>Drop the background</h3>
          <p>A wall, a table or a green screen disappears with one tick, so the beads go on the subject instead of the scenery.</p>
        </article>

        <article class="feature">
          <div class="ico" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h7"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>
          </div>
          <h3>A list you can shop from</h3>
          <p>Counts per colour, sorted by volume, with a CSV download for the bead shop run.</p>
        </article>

        <article class="feature">
          <div class="ico" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
          </div>
          <h3>Nothing leaves the tab</h3>
          <p>The conversion runs in JavaScript on your device. No upload, no account, no retention policy to read.</p>
        </article>

        <article class="feature">
          <div class="ico" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V4h12v5"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M8 17h8v4H8z"/></svg>
          </div>
          <h3>Prints at 100%</h3>
          <p>A4 sheets, tiled automatically for large patterns, with the page range printed on every sheet.</p>
        </article>

        <article class="feature">
          <div class="ico" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>
          </div>
          <h3>Palette to match your stash</h3>
          <p>Perler, Hama and Artkal-style sets are built in. Switch one dropdown and the chart remaps.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section section--ink">
    <div class="wrap split">
      <div class="prose">
        <p class="eyebrow-line">Sizing</p>
        <h2>Which pegboard should I use?</h2>
        <p>A 29 × 29 square pegboard is the workhorse for perler projects. It gives you enough cells for a clear animal face or a small scene without turning into a multi-evening build.</p>
        <p>Use a 10 × 10 or 16 × 16 board for keychains and magnets. Go to 48 × 48 or 64 × 64 when you want a wall piece and are ready to print the chart across several sheets.</p>
        <p>${sizeLinks}</p>
      </div>
      <div class="table-wrap">
        <table class="beads">
          <thead><tr><th>Project</th><th>Grid</th><th>Print</th></tr></thead>
          <tbody>
            <tr><td>Keychain / magnet</td><td class="num">10–16</td><td>1 sheet</td></tr>
            <tr><td>Standard square board</td><td class="num">29 × 29</td><td>1 sheet</td></tr>
            <tr><td>Large wall piece</td><td class="num">48 × 48</td><td>4 sheets</td></tr>
            <tr><td>Statement piece</td><td class="num">64 × 64</td><td>6–9 sheets</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Pattern library</p>
        <h2>Start from a design instead</h2>
        <p>Thirty free designs with exact bead counts. Open one in the maker to recolour it, fix a bead or print the chart.</p>
      </div>
      <div class="pattern-grid">
        ${featured.map(function (def) { return designCard(def, { home: true }); }).join("\n        ")}
      </div>
      <p style="margin-top:22px"><a class="btn" href="/perler-bead-designs/">Browse all 30 designs</a></p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Questions</p>
        <h2>Questions people ask before their first board</h2>
      </div>
      ${faq(FAQ_HOME)}
    </div>
  </section>

  ${keepGoing("home")}

  ${ctaBand("Turn a photo into a pegboard tonight", "Free, no account, and the bead list is already counted.", "#tool", "Open the maker")}
</main>
${footer()}
${toolConfigScript({ cols: 32, rows: "square", palette: "perler", maxColors: 18 })}
${scripts({ tool: true })}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// collection pages
// ---------------------------------------------------------------------------

function designsPage() {
  const defs = BPMPatterns.LIST;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Perler bead designs",
    url: SITE + "/perler-bead-designs/",
    description: "Thirty free perler bead designs with grid sizes, colour codes and printable PDFs.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: defs.length,
      itemListElement: defs.map(function (d, i) {
        return { "@type": "ListItem", position: i + 1, name: d.name, url: SITE + designHref(d) };
      })
    }
  };
  return head({
    title: `Perler Bead Designs – ${DESIGN_COUNT} Free Ideas and Patterns`,
    desc: "Browse 30 free perler bead designs with grid sizes, exact colour counts and printable PDFs. Open any design in the maker to recolour it or fix a bead.",
    path: "/perler-bead-designs/",
    active: "designs",
    ogTitle: "Perler bead designs — 30 free coded patterns",
    ogDesc: "Animals, flowers, food, space, retro and 3D designs with bead counts and PDFs.",
    schema: schema
  }) + `<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: "Perler bead designs" }])}
      <h1>Perler bead designs</h1>
      <p class="lede">${DESIGN_COUNT} free perler bead designs, each one drawn bead by bead for a standard 5 mm pegboard. Every card shows the grid size, the number of colours and the exact bead count, so you know what a design will use before you pull a single bead. Most are small, easy perler bead designs that fit on one square board — cute animals, flowers, food, space, retro, holiday and 3D shapes — and each one comes with a free printable PDF chart. Click “Make this pattern” to open a design in the maker, where you can swap it to Hama or Artkal colours or fix a single bead before you print. They are original patterns, not traced artwork.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      ${filterBar()}
      <div class="pattern-grid" data-gallery>
        ${defs.map(function (def) { return designCard(def); }).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section band" id="sizes">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Pick a size</p>
        <h2>Match the design to the board you own</h2>
        <p>Most of the designs here are 11–15 beads across, so any of them fits a standard 29 × 29 board with room for a border. For a 10 × 10 keychain board, make your own chart from a photo at 10 beads wide.</p>
      </div>
      <div class="table-wrap">
        <table class="beads">
          <thead><tr><th>Board</th><th>Best for</th><th>Approx. finished size</th><th>Time</th></tr></thead>
          <tbody>
            <tr><td>10 × 10</td><td>Keychain, magnet, hair clip</td><td class="num">5 × 5 cm</td><td>10–20 min</td></tr>
            <tr><td>16 × 16</td><td>Small character, pin</td><td class="num">8 × 8 cm</td><td>20–40 min</td></tr>
            <tr><td>29 × 29</td><td>Standard square board</td><td class="num">14.5 × 14.5 cm</td><td>1–2 hours</td></tr>
            <tr><td>48 × 48</td><td>Large wall piece</td><td class="num">24 × 24 cm</td><td>3–5 hours</td></tr>
            <tr><td>64 × 64</td><td>Statement piece</td><td class="num">32 × 32 cm</td><td>6+ hours</td></tr>
          </tbody>
        </table>
      </div>
      <p class="note">Finished sizes assume 5 mm midi beads and no gaps between beads. Mini beads are about 2.6 mm; maxi beads are about 10 mm.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Make it yours</p>
        <h2>Three ways to use a design</h2>
      </div>
      <div class="callout-grid">
        <article class="callout-card">
          <span class="num">1</span>
          <h3>Open it in the maker</h3>
          <p>Click “Make this pattern” and the chart opens in the editor. Paint or erase individual beads, and undo any slip with one keystroke.</p>
        </article>
        <article class="callout-card">
          <span class="num">2</span>
          <h3>Switch it to your beads</h3>
          <p>Pick the Hama or Artkal palette and every bead swaps to that brand's colour for the same code, so the chart and the bead list match the jar you own.</p>
        </article>
        <article class="callout-card">
          <span class="num">3</span>
          <h3>Print the coded chart</h3>
          <p>Download the PDF for a numbered chart with a bead list. Print at 100% if you want the grid to match the physical board.</p>
        </article>
      </div>
    </div>
  </section>

  ${keepGoing("designs")}

  ${ctaBand("Have a photo you want to turn into beads?", "Upload it to the free perler bead pattern maker and get a coded chart in seconds.", "/#tool", "Open the maker")}
</main>
${footer()}
${scripts({ gallery: true })}
</body>
</html>`;
}

// The ideas page is sorted by what the finished piece is for, not by theme, so
// it does not repeat the designs page. Designs missing from every group land
// in a catch-all group at the end.
const IDEA_GROUPS = [
  {
    id: "easy",
    label: "Beginners",
    title: "Easy fuse bead ideas for beginners",
    intro: "One to three colours and a simple outline, so a first board takes well under an hour and there is nothing to count twice. Start here if you have never fused a piece before.",
    slugs: ["berry-heart", "star", "smiley", "dinosaur", "cat"]
  },
  {
    id: "small",
    label: "Keychains & magnets",
    title: "Small fuse bead ideas: keychains, magnets and charms",
    intro: "Little designs that stay light enough to hang from a bag or hold up a note on the fridge. Iron both sides, because small pieces get handled the most.",
    slugs: ["pastel-heart", "mushroom", "fox", "butterfly", "ginger-cat", "alien"]
  },
  {
    id: "gifts",
    label: "Gifts",
    title: "Fuse bead ideas for gifts and cards",
    intro: "Flat, light and quick to make, which is exactly what you want for a gift tag, a bookmark or something tucked inside a birthday card.",
    slugs: ["strawberry", "bunny", "cassette", "frog"]
  },
  {
    id: "party",
    label: "Party & holidays",
    title: "Party and holiday fuse bead ideas",
    intro: "Garlands, cupcake toppers and table decorations for Halloween, Christmas and birthdays. Make several at once; they look better as a set.",
    slugs: ["ghost", "pumpkin", "christmas-tree", "rocket", "mint-rocket"]
  },
  {
    id: "decor",
    label: "Room & desk",
    title: "Fuse bead ideas for your room and desk",
    intro: "Coasters, window hangings, mobiles and shelf pieces. Iron these on both sides so they stay flat once they are on display.",
    slugs: ["daisy", "rainbow", "panda", "goldfish", "bee", "ringed-planet", "blue-toadstool", "game-controller"]
  },
  {
    id: "3d",
    label: "3D",
    title: "3D fuse bead ideas",
    intro: "Flat pieces shaded to look solid. Make a few in different colours and they turn into a small sculpture on a shelf.",
    slugs: ["cube", "3d-heart"]
  }
];

function ideaGroups() {
  const used = new Set();
  const groups = IDEA_GROUPS.map(function (group) {
    const defs = group.slugs.map(function (slug) {
      const def = BPMPatterns.find(slug);
      if (!def) throw new Error("IDEA_GROUPS lists unknown design " + slug);
      used.add(slug);
      return def;
    });
    return Object.assign({}, group, { defs: defs });
  });
  const rest = BPMPatterns.LIST.filter(function (def) { return !used.has(def.slug); });
  if (rest.length) {
    groups.push({
      id: "more",
      label: "More",
      title: "More fuse bead ideas",
      intro: "The newest designs in the library, each with a tip for finishing it.",
      defs: rest
    });
  }
  return groups;
}

function ideasPage() {
  const groups = ideaGroups();
  const defs = [].concat.apply([], groups.map(function (g) { return g.defs; }));
  const ironLink = Pages.isLive("/how-to-iron-perler-beads/")
    ? `<p class="note">Read the <a href="/how-to-iron-perler-beads/">step-by-step ironing guide</a> before your first fuse.</p>`
    : "";
  const craftIdeas = [
    ["Keychain", "Add a jump ring and a split ring. Use a 10 × 10 or 16 × 16 design so it does not pull at a pocket.", "keychain"],
    ["Fridge magnet", "Glue a magnetic strip to the back. A 13 × 13 design is light enough to stay put.", "magnet"],
    ["Coaster", "Centre a simple motif on a 29 × 29 board, fill the space around it and back it with cork. Iron both sides well.", "coaster"],
    ["Pin badge", "Use a small design and attach a pin back with strong glue. Avoid ironing the back too flat where the pin sits.", "pin"],
    ["Bag charm", "Make two matching designs, iron them flat, and join with a short chain or a bead loop.", "charm"],
    ["Ornament", "Leave a gap at the top for a ribbon, or add a loop of beads before fusing. Good for holiday trees and windows.", "ornament"]
  ];
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Fuse bead ideas",
    url: SITE + "/fuse-bead-ideas/",
    description: "Fuse bead ideas sorted by occasion, with free designs, colour counts and printable charts.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: defs.length,
      itemListElement: defs.map(function (d, i) {
        return { "@type": "ListItem", position: i + 1, name: d.name, url: SITE + designHref(d) };
      })
    }
  };
  return head({
    title: `Fuse Bead Ideas – ${DESIGN_COUNT} Designs to Inspire You`,
    desc: `${DESIGN_COUNT} fuse bead ideas sorted by what you want to make: easy first projects, keychains and magnets, gifts, party decorations, room decor and 3D pieces.`,
    path: "/fuse-bead-ideas/",
    active: "ideas",
    ogTitle: `Fuse bead ideas — ${DESIGN_COUNT} designs sorted by occasion`,
    ogDesc: "Find a design, open it in the maker, and turn it into a keychain, magnet, gift or decoration.",
    schema: schema
  }) + `<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: "Fuse bead ideas" }])}
      <h1>Fuse bead ideas</h1>
      <p class="lede">Fuse bead ideas for the moment you have a tray of beads and no plan. This page is sorted by what you want to make — easy first projects, small pieces for keychains and magnets, gifts and cards, party and holiday decorations, things for your room, and 3D builds. Every idea comes with a ready-made design, an exact bead count and a free printable chart, plus a tip for turning the flat piece into something you will actually use. Fuse beads, Perler beads and Hama beads are the same craft under different brand names, so each idea works with whichever jar you own. Open a design in the maker to switch it to your bead brand or fix a bead before you start.</p>
      <nav class="filter-bar jump-bar" aria-label="Jump to a group of ideas">
        <span class="filter-label">Jump to</span>
        ${groups.map(function (g) { return `<a href="#${g.id}">${esc(g.label)}</a>`; }).join("\n        ")}
      </nav>
    </div>
  </section>

  ${groups.map(function (g, i) {
    return `<section class="section section--tight" id="${g.id}">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">${pad2(i + 1)} / ${esc(g.label)}</p>
        <h2>${esc(g.title)}</h2>
        <p>${esc(g.intro)}</p>
      </div>
      <div class="pattern-grid">
        ${g.defs.map(function (def) { return designCard(def, { text: "idea" }); }).join("\n        ")}
      </div>
    </div>
  </section>`;
  }).join("\n\n  ")}

  <section class="section section--tight">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Six ways to finish a design</p>
        <h2>What can you make with fuse beads?</h2>
        <p>The chart is only half the project. A finished piece needs a backing, a loop or a reason to sit on a shelf.</p>
      </div>
      <div class="callout-grid">
        ${craftIdeas.map(function (idea) {
          return `<article class="callout-card">
          <span class="num" aria-hidden="true">✦</span>
          <h3>${esc(idea[0])}</h3>
          <p>${esc(idea[1])}</p>
        </article>`;
        }).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section band">
    <div class="wrap split">
      <div class="prose">
        <p class="eyebrow-line">Naming</p>
        <h2>Fuse beads, perler beads, hama beads — same idea?</h2>
        <p>They are all small plastic beads with a hole through the middle that are placed on a pegboard and fused with heat. “Perler” is the best-known brand in the US, “Hama” is common in Europe, and “Artkal” is popular for large colour ranges.</p>
        <p>Because the bead size and grid are the same, a design written for one can usually be made with another. The colours will not match exactly — that is why the maker lets you switch palettes and see the closest available bead.</p>
        <p>If you are shopping for beads, check the bead diameter on the packet. Midi beads are about 5 mm and fit the standard square pegboards; mini beads need finer tips and a different board.</p>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px">Before you start</h3>
        <ul class="spec-list">
          <li><span class="check-mark" aria-hidden="true">✓</span>Match the bead size to your pegboard</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>Count the colours before you sit down</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>Keep a spare sheet of ironing paper handy</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>Work on a flat, heat-safe surface</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>Let the piece cool under a book to stop curling</li>
        </ul>
        ${ironLink}
      </div>
    </div>
  </section>

  ${keepGoing("ideas")}

  ${ctaBand("Turn one of these ideas into your own pattern", "Upload a photo or open a design, then print the coded chart.", "/#tool", "Make a pattern")}
</main>
${footer()}
${scripts({})}
</body>
</html>`;
}

function patternsPage() {
  const defs = BPMPatterns.LIST;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Fuse bead patterns",
    url: SITE + "/fuse-bead-patterns/",
    description: "Free printable fuse bead patterns with colour codes, bead counts and PDF charts.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: defs.length,
      itemListElement: defs.map(function (d, i) {
        return { "@type": "ListItem", position: i + 1, name: d.name, url: SITE + "/fuse-bead-patterns/#" + d.slug };
      })
    }
  };
  return head({
    title: "Fuse Bead Patterns – Free Printable Charts (PDF)",
    desc: "Free printable fuse bead patterns with a colour code in every cell, exact bead counts and an A4 PDF. Thirty original designs for Perler and Hama beads.",
    path: "/fuse-bead-patterns/",
    active: "patterns",
    ogTitle: "Fuse bead patterns — free printable PDF charts",
    ogDesc: "Thirty free charts with colour codes and bead lists. Print at 100% or open one in the maker.",
    schema: schema
  }) + `<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: "Fuse bead patterns" }])}
      <h1>Fuse bead patterns</h1>
      <p class="lede">Free printable fuse bead patterns with a colour code in every cell, a heavier line every five beads and an exact bead list on the last page. Each PDF is built for A4 paper and prints at 100%, so the grid can sit next to your pegboard while you work. The thirty charts below are original designs, not copied artwork, and each one can be opened in the maker if you want to switch it to another bead brand or fix a bead. Print one for a quick keychain, or centre a chart on a full 29 × 29 board for something bigger.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="filter-bar" data-filter-bar role="group" aria-label="Filter patterns by theme">
        <span class="filter-label">Filter</span>
        ${BPMPatterns.THEMES.map(function (t, i) {
          return `<button type="button" data-filter="${t.id}" aria-pressed="${i === 0 ? "true" : "false"}">${esc(t.label)}</button>`;
        }).join("\n        ")}
      </div>
      <p class="gallery-count" data-gallery-count><b>${defs.length}</b> printable charts</p>
      <div class="pattern-grid" data-gallery>
        ${defs.map(function (def) { return designCard(def, { action: "pdf" }); }).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section band" id="reading">
    <div class="wrap split">
      <div class="prose">
        <p class="eyebrow-line">Reading a chart</p>
        <h2>How to read a fuse bead pattern</h2>
        <p>Each coloured cell is one bead. The letter in the cell is the palette code, and the legend on the last page tells you the colour name and how many you need. If a cell is blank, leave that peg empty.</p>
        <p>Count in fives. The heavier grid lines mark every fifth row and column, which is why the chart is easier to follow than a plain pixel image. Work in blocks rather than one bead at a time, and check the outline before you start filling.</p>
        <p>For a large pattern, print the PDF and tape the sheets together along the printed column and row ranges. The page footer tells you which slice of the chart you are holding.</p>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px">Every chart includes</h3>
        <ul class="spec-list">
          <li><span class="check-mark" aria-hidden="true">✓</span>One letter code per bead</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>Exact count for each colour</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>Total bead count</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>A heavier line every 5 beads</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>Column and row ranges for tiled pages</li>
          <li><span class="check-mark" aria-hidden="true">✓</span>A4 PDF at 100% scale</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Need a custom chart?</p>
        <h2>Turn your own photo into a fuse bead pattern</h2>
        <p>The maker uses the same chart and bead-list layout as the PDFs above. Upload a photo, choose a palette and print the result.</p>
      </div>
      <p><a class="btn btn--primary" href="/#tool">Open the pattern maker</a>${Pages.isLive("/perler-bead-templates/") ? ` <a class="btn btn--ghost" href="/perler-bead-templates/">Get a blank template</a>` : ""}</p>
    </div>
  </section>

  ${keepGoing("patterns")}

  ${ctaBand("Want the same chart with your own photo?", "Upload a photo, get a coded chart and a printable PDF in about a minute.", "/#tool", "Make my pattern")}
</main>
${footer()}
${scripts({ gallery: true })}
</body>
</html>`;
}

const TEMPLATES = [
  { slug: "10-square", name: "10 × 10 square", w: 10, h: 10, note: "Keychains, magnets and tiny motifs." },
  { slug: "16-square", name: "16 × 16 square", w: 16, h: 16, note: "Small characters and pins with a little more detail." },
  { slug: "20-square", name: "20 × 20 square", w: 20, h: 20, note: "A flexible size for mini scenes and gifts." },
  { slug: "29-square", name: "29 × 29 square", w: 29, h: 29, note: "The standard square pegboard size." },
  { slug: "48-square", name: "48 × 48 square", w: 48, h: 48, note: "Large wall pieces; prints across four sheets." },
  { slug: "64-square", name: "64 × 64 square", w: 64, h: 64, note: "Statement pieces; prints across six to nine sheets." }
];

function templatesPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Perler bead templates",
    url: SITE + "/perler-bead-templates/",
    description: "Free printable perler bead templates in 10×10, 16×16, 20×20, 29×29, 48×48 and 64×64 grids.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: TEMPLATES.length,
      itemListElement: TEMPLATES.map(function (t, i) {
        return { "@type": "ListItem", position: i + 1, name: t.name + " template", url: SITE + "/perler-bead-templates/#" + t.slug };
      })
    }
  };
  return head({
    title: "Perler Bead Templates – Free Printable PDF Grids",
    desc: "Free printable perler bead templates in six square sizes, from 10×10 to 64×64. Download an A4 PDF with grid lines and print at 100%.",
    path: "/perler-bead-templates/",
    active: "templates",
    ogTitle: "Perler bead templates — free printable grids",
    ogDesc: "Blank 10×10, 16×16, 20×20, 29×29, 48×48 and 64×64 grids in one click.",
    schema: schema
  }) + `<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: "Perler bead templates" }])}
      <h1>Perler bead templates</h1>
      <p class="lede">Free printable perler bead templates for the days when you want to draw your own design instead of converting a photo. Each template is a blank grid with a heavier line every five beads, sized for a standard pegboard and set up to print at 100% on A4. Use the 10 × 10 or 16 × 16 grid for a keychain, the 29 × 29 for a standard square board, and the 48 × 48 or 64 × 64 when you are planning a larger piece. Draw one cell at a time, or colour the squares in before you place the beads.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="template-grid">
        ${TEMPLATES.map(templateCard).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section band">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Size guide</p>
        <h2>Which template size should I print?</h2>
        <p>Choose by finished size first, then by how much detail you need. A larger grid gives more detail but takes longer to fill.</p>
      </div>
      <div class="table-wrap">
        <table class="beads">
          <thead><tr><th>Template</th><th>Finished size (5 mm beads)</th><th>Good for</th><th>PDF pages</th></tr></thead>
          <tbody>
            <tr><td>10 × 10</td><td class="num">5 × 5 cm</td><td>Keychain, magnet, hair clip</td><td class="num">1</td></tr>
            <tr><td>16 × 16</td><td class="num">8 × 8 cm</td><td>Pin, small character, gift tag</td><td class="num">1</td></tr>
            <tr><td>20 × 20</td><td class="num">10 × 10 cm</td><td>Coaster, framed mini, card topper</td><td class="num">1</td></tr>
            <tr><td>29 × 29</td><td class="num">14.5 × 14.5 cm</td><td>Standard square pegboard</td><td class="num">1</td></tr>
            <tr><td>48 × 48</td><td class="num">24 × 24 cm</td><td>Large wall piece</td><td class="num">4</td></tr>
            <tr><td>64 × 64</td><td class="num">32 × 32 cm</td><td>Statement piece</td><td class="num">6–9</td></tr>
          </tbody>
        </table>
      </div>
      <p class="note">Finished sizes assume 5 mm midi beads and no gaps. If you use mini or maxi beads, the finished size changes even though the grid does not.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Printing</p>
        <h2>How to print a template so the grid matches your board</h2>
      </div>
      <div class="callout-grid">
        <article class="callout-card">
          <span class="num">1</span>
          <h3>Print at 100%</h3>
          <p>Turn off “fit to page” in the print dialog. The PDF is set up for A4; on Letter paper, choose “actual size” and check the first page with a ruler.</p>
        </article>
        <article class="callout-card">
          <span class="num">2</span>
          <h3>Check one cell</h3>
          <p>Measure a single square. For a 5 mm bead board, one cell should be 5 mm across. If it is not, the print scale is wrong.</p>
        </article>
        <article class="callout-card">
          <span class="num">3</span>
          <h3>Tape the sheets</h3>
          <p>For 48 × 48 and 64 × 64, overlap the printed edges and tape along the grid lines. The page footer tells you which columns and rows you are holding.</p>
        </article>
      </div>
    </div>
  </section>

  ${keepGoing("templates")}

  ${ctaBand("Prefer to start from a photo?", "The perler bead pattern maker will fill the grid for you and count every colour.", "/#tool", "Open the maker")}
</main>
${footer()}
${scripts({})}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// tool landing pages
// ---------------------------------------------------------------------------

function toolPage(opts) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: opts.h1,
        url: SITE + opts.path,
        applicationCategory: "DesignApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        description: opts.desc,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
      },
      faqSchema(opts.faq)
    ]
  };
  return head({
    title: opts.title,
    desc: opts.desc,
    path: opts.path,
    active: opts.active || "home",
    ogTitle: opts.ogTitle,
    ogDesc: opts.ogDesc,
    schema: schema
  }) + `<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: opts.h1 }])}
      <span class="eyebrow">${esc(opts.eyebrow)}</span>
      <h1>${esc(opts.h1)}</h1>
      <p class="lede">${opts.lede}</p>
      <div class="hero-meta">
        ${opts.meta.map(function (m) {
          return `<span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>${esc(m)}</span>`;
        }).join("\n        ")}
      </div>
    </div>
  </section>

  ${toolMarkup(opts.config)}

  <section class="section section--tight">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">${esc(opts.sectionLabel)}</p>
        <h2>${esc(opts.sectionTitle)}</h2>
        <p>${opts.sectionIntro}</p>
      </div>
      <div class="callout-grid">
        ${opts.cards.map(function (card) {
          return `<article class="callout-card">
          <span class="num" aria-hidden="true">${card.num}</span>
          <h3>${esc(card.title)}</h3>
          <p>${card.text}</p>
        </article>`;
        }).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow-line">Questions</p>
        <h2>${esc(opts.faqTitle)}</h2>
      </div>
      ${faq(opts.faq)}
    </div>
  </section>

  ${keepGoing(opts.key)}

  ${ctaBand(opts.ctaTitle, opts.ctaText, "#tool", "Open the maker")}
</main>
${footer()}
${toolConfigScript(opts.config)}
${scripts({ tool: true })}
</body>
</html>`;
}

function makerPage() {
  return toolPage({
    key: "maker",
    title: "Perler Bead Maker – Turn a Photo into Beads",
    desc: "A free perler bead maker that turns a photo into a coded chart with exact bead counts and a printable PDF. Edit any bead before you export.",
    path: "/perler-bead-maker/",
    h1: "Perler bead maker",
    eyebrow: "Photo in, coded chart out",
    lede: "Turn a photo into a perler bead pattern you can actually build. The maker picks the closest bead colours, puts a code in every cell, counts what you need and lays the whole thing out for printing. Click any bead to change it — the chart is the starting point, not the final word.",
    meta: ["Photo stays in your browser", "26 perler-style colours", "Editable grid", "A4 PDF + bead list"],
    config: { cols: 32, rows: "square", palette: "perler", maxColors: 18 },
    sectionLabel: "The editor",
    sectionTitle: "What makes this perler bead maker different",
    sectionIntro: "Automatic conversion is the easy part. The work is in the twenty minutes after it: fixing an eye, dropping a colour you ran out of, and printing a chart you can follow.",
    cards: [
      { num: "1", title: "A code in every cell", text: "You should never have to guess whether a square is peach or light pink. Every cell carries the palette code, and the legend gives the name and count." },
      { num: "2", title: "Edit before you place", text: "Paint, erase or pick a bead straight on the chart. Undo covers every stroke, so a mis-click costs nothing." },
      { num: "3", title: "Print a chart, not a picture", text: "The PDF gives you a grid, a heavier line every five beads, tiled pages for large patterns and a final bead list." }
    ],
    faqTitle: "Perler bead maker questions",
    faq: [
      { q: "Is this perler bead maker free?", a: "Yes. The maker and the exports are free, with no account, no watermark and no upload. Your photo is processed in the browser." },
      { q: "Can I use a phone photo?", a: "Yes. A well-lit photo with one clear subject works best. Crop tight to the subject and remove a plain background if the photo has one." },
      { q: "Can I edit the chart after it is made?", a: "Yes. Click a bead to paint it, erase it or pick up its colour. The bead counts update live, so you can see exactly how a change affects the shopping list." },
      { q: "Which palette should I choose?", a: "Choose the brand you actually own. Perler, Hama and Artkal have different colour ranges; switching the palette remaps the chart to the closest beads in that set." }
    ],
    ctaTitle: "Make your first coded chart",
    ctaText: "Upload a photo and print a perler pattern in about a minute."
  });
}

function generatorPage() {
  return toolPage({
    key: "generator",
    title: "Perler Bead Generator – Instant Pattern from Any Image",
    desc: "Free online perler bead generator. Turn any image into a coded bead chart with Perler, Hama or Artkal colours, exact counts and a printable PDF.",
    path: "/perler-bead-generator/",
    h1: "Perler bead generator",
    eyebrow: "Instant pattern, still editable",
    lede: "A perler bead generator should give you a pattern you can trust, not a blurry preview. This one produces a real chart: one cell per bead, a palette code in every cell, a count for each colour and a PDF laid out for A4. Upload an image, choose a grid size, and the generator does the rest — then fix any cell by hand before you print.",
    meta: ["Perler, Hama & Artkal", "12–80 beads wide", "Background removal", "PNG, PDF & CSV"],
    config: { cols: 48, rows: "square", palette: "perler", maxColors: 20 },
    sectionLabel: "Under the hood",
    sectionTitle: "How the perler bead generator picks colours",
    sectionIntro: "The image is averaged down to one colour per bead, then each cell is matched to the nearest colour in your chosen palette using a perceptual colour space. It is not a pixel filter — it is a bead chart.",
    cards: [
      { num: "1", title: "Average the cell", text: "Each bead cell is an average of the pixels underneath it, so a photo with fine detail still produces one solid colour per peg." },
      { num: "2", title: "Match in Lab space", text: "Colours are compared by perceived difference rather than raw RGB distance, which keeps skin tones and pastels closer to what the eye expects." },
      { num: "3", title: "Cap the palette", text: "Use the max-colours slider to pull a busy photo down to a bead count you can actually shop for. The least-used colours merge into their nearest neighbour." }
    ],
    faqTitle: "Perler bead generator questions",
    faq: [
      { q: "What does a perler bead generator do?", a: "It converts an image into a grid where each cell represents one bead. The output here includes a palette code per cell, a count per colour and a printable chart." },
      { q: "How many colours should I use?", a: "For a small keychain, 6–10 colours is usually plenty. For a 29 × 29 board, 12–18 is a comfortable range. Fewer colours make the chart faster to shop for and easier to read." },
      { q: "Can I remove the background?", a: "Yes. Tick “Remove a plain background” and the generator will flood-fill from the edges of the image. It works best on a wall, table or other plain backdrop." },
      { q: "Does it work offline?", a: "Once the page has loaded, the conversion runs in your browser. The site itself needs an internet connection the first time, but your photo is never sent to a server." }
    ],
    ctaTitle: "Generate a perler pattern",
    ctaText: "Drop in an image and get a coded chart with a bead list."
  });
}

function fuseMakerPage() {
  return toolPage({
    key: "fuseMaker",
    title: "Fuse Bead Pattern Maker – Free Online Generator",
    desc: "Free fuse bead pattern maker for Perler, Hama and Artkal beads. Convert a photo into a coded chart, edit any bead and print a ready-to-follow PDF.",
    path: "/fuse-bead-pattern-maker/",
    h1: "Fuse bead pattern maker",
    eyebrow: "One maker, three bead palettes",
    lede: "Make a fuse bead pattern from any photo, then choose the bead palette that matches the jar on your shelf. Perler, Hama and Artkal-style sets are built in, so the same picture can become three different charts. Every cell is coded, every colour is counted, and the PDF prints at 100% with a heavier line every five beads.",
    meta: ["Three bead palettes", "Editable chart", "Exact colour counts", "Print at 100%"],
    config: { cols: 29, rows: "square", palette: "hama", maxColors: 16 },
    sectionLabel: "One engine, three palettes",
    sectionTitle: "Which fuse bead palette should you use?",
    sectionIntro: "The right palette is the one you can actually buy. Switch it before you export and the chart remaps to the closest available colour in that set.",
    cards: [
      { num: "1", title: "Perler-style", text: "The US workhorse. A broad, familiar range with plenty of brights, pastels and neutrals for character and animal designs." },
      { num: "2", title: "Hama-style", text: "Common in Europe. Similar bead size, slightly different colour names and availability. Choose it if your stash is Hama." },
      { num: "3", title: "Artkal-style", text: "A large colour range that is popular for detailed pieces. The chart will use the closest Artkal-style beads rather than the Perler set." }
    ],
    faqTitle: "Fuse bead pattern maker questions",
    faq: [
      { q: "Are fuse beads and perler beads the same?", a: "They are the same type of craft bead: small plastic barrels placed on a pegboard and fused with heat. Perler, Hama and Artkal are different brands with different colour ranges, but the grid and bead size are usually compatible." },
      { q: "Can I use this maker for Hama beads?", a: "Yes. Choose the Hama-style palette before you export and the chart will use the closest Hama colours. Check a real bead against the screen swatch before a large project." },
      { q: "What grid size should I use?", a: "29 × 29 matches a standard square pegboard. Use 16 × 16 for a keychain or magnet and 48 × 48 or 64 × 64 for a larger wall piece." },
      { q: "Can I sell what I make?", a: "The patterns you generate from your own photos are yours to use. The site's original gallery designs are free to make for personal use; if you plan to sell finished pieces, use your own source images and check the terms of the bead brand you use." }
    ],
    ctaTitle: "Make a fuse bead pattern",
    ctaText: "Start with a photo, then switch the palette to match your beads."
  });
}

// ---------------------------------------------------------------------------
// guide page
// ---------------------------------------------------------------------------

function ironGuidePage() {
  const faqs = [
    {
      q: "What temperature should I use to iron perler beads?",
      a: "Use a medium setting with no steam — usually the synthetic or medium-high range on a household iron. Too hot can flatten or discolour the beads; too cool leaves the rings unfused. Test on a small scrap piece first."
    },
    {
      q: "How long do you iron perler beads?",
      a: "About 10–20 seconds of steady, circular pressure for the first side, then check. The exact time depends on the iron, the paper and the bead size. Keep the iron moving and lift the paper to check often rather than ironing blind."
    },
    {
      q: "Do you iron perler beads on both sides?",
      a: "For a flat piece that will be handled, yes — iron one side until the beads just fuse, let it cool, flip it and iron the other side. If you only need a decorative one-sided piece, one side can be enough, but it will be more fragile."
    },
    {
      q: "Why did my perler beads curl?",
      a: "Curling usually comes from uneven heating or from moving the piece while it is still warm. Iron evenly, keep the paper between the iron and the beads, and press the finished piece under a heavy book while it cools."
    },
    {
      q: "Can I use baking paper instead of ironing paper?",
      a: "Ironing paper is formulated not to stick. Baking paper can work in a pinch, but test a scrap first and never use wax paper — the wax will melt onto the beads and the iron."
    },
    {
      q: "How do I fix a bead that did not fuse?",
      a: "Put the paper back over the piece and apply light, even heat to that area for a few seconds. If a bead is missing or melted, let the piece cool completely before deciding whether to patch it or remake that section."
    }
  ];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        name: "How to iron perler beads",
        description: "A step-by-step guide to fusing perler beads with a household iron.",
        totalTime: "PT10M",
        tool: [
          { "@type": "HowToTool", name: "Household iron" },
          { "@type": "HowToTool", name: "Ironing paper" },
          { "@type": "HowToTool", name: "Pegboard" }
        ],
        step: [
          { "@type": "HowToStep", name: "Set up", text: "Place the finished pegboard on a flat, heat-safe surface and cover the beads with ironing paper." },
          { "@type": "HowToStep", name: "Set the iron", text: "Set the iron to a medium setting with no steam." },
          { "@type": "HowToStep", name: "Iron the first side", text: "Press and move the iron in slow circles for 10–20 seconds, then lift the paper to check the fuse." },
          { "@type": "HowToStep", name: "Cool and flip", text: "Let the piece cool for a minute, then flip it and iron the second side if you want a sturdier piece." },
          { "@type": "HowToStep", name: "Press flat", text: "While still warm, press the piece under a heavy book to keep it flat." }
        ]
      },
      faqSchema(faqs)
    ]
  };
  return head({
    title: "How to Iron Perler Beads (Step-by-Step Guide)",
    desc: "Learn how to iron perler beads without curling or melting them. Temperature, timing, paper, two-sided fusing and troubleshooting in one guide.",
    path: "/how-to-iron-perler-beads/",
    active: "iron",
    ogTitle: "How to iron perler beads — step-by-step",
    ogDesc: "Temperature, timing, paper and troubleshooting for a flat, evenly fused perler piece.",
    schema: schema
  }) + `<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${breadcrumb([{ label: "Home", href: "/" }, { label: "How to iron perler beads" }])}
      <span class="eyebrow">Beginner friendly</span>
      <h1>How to iron perler beads</h1>
      <p class="lede">Ironing is the step that turns a tray of plastic rings into a piece you can hold. It is also the step most likely to go wrong: a little too much heat and the beads flatten into a pancake, too little and the piece falls apart. This guide covers the setup, the temperature, the timing and the fixes, without asking you to guess.</p>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap guide-layout">
      <div class="prose">
        <div class="callout">
          <strong>The short version:</strong> medium heat, no steam, ironing paper between the iron and the beads, 10–20 seconds of slow circular pressure, check, repeat. Let it cool flat under a book.
        </div>

        <h2 id="supplies">What you need</h2>
        <ul>
          <li><strong>A household iron.</strong> A normal clothes iron is fine. Steam is the enemy, so empty the water tank or set it to dry.</li>
          <li><strong>Ironing paper.</strong> Use the paper that came with your beads or a dedicated perler ironing sheet. Baking paper can work in a pinch; wax paper cannot.</li>
          <li><strong>A flat, heat-safe surface.</strong> An ironing board or a sturdy table with a towel or heat mat. Avoid a soft, uneven surface that lets the board flex.</li>
          <li><strong>Your pegboard.</strong> The beads should still be on the board for the first fuse. Do not try to iron a loose design.</li>
          <li><strong>A heavy book.</strong> For pressing the piece flat while it cools.</li>
        </ul>

        <h2 id="temperature">Set the iron</h2>
        <p>Set the iron to a medium heat — often the “synthetic” or medium-high setting on a household iron. Turn steam off completely. If your iron has a water tank, empty it before you start; steam can make the paper wrinkle and leave a mottled finish.</p>
        <p>Every iron is different. The first time you use a new iron, test on a small scrap of beads rather than a piece you have spent an hour placing. You are looking for the rings to close and stick together, not to melt into a flat sheet.</p>

        <h2 id="first-side">Iron the first side</h2>
        <ol class="guide-steps">
          <li>
            <h3>Cover the beads</h3>
            <p>Lay the ironing paper over the finished design so every bead is covered. Hold the paper by the edges and keep it flat.</p>
          </li>
          <li>
            <h3>Press and move</h3>
            <p>Place the iron on the paper and move it in slow, overlapping circles. Do not hold it still in one spot. Ten to twenty seconds is a reasonable starting point for a small piece.</p>
          </li>
          <li>
            <h3>Lift and check</h3>
            <p>Lift the paper and look at the beads. The rings should be closed and touching. If they still look like separate donuts, cover them again and repeat in short bursts.</p>
          </li>
          <li>
            <h3>Do not over-iron</h3>
            <p>Stop when the holes are mostly closed. If you keep going, the beads flatten and the piece loses its texture. A slightly visible hole is normal and keeps the piece from becoming brittle.</p>
          </li>
        </ol>

        <h2 id="second-side">Flip and iron the second side</h2>
        <p>Let the piece cool for a minute, then peel the paper away. If the beads are still hot, wait. Once the piece is cool enough to handle, flip it over, cover it with paper and iron the back for another 10–20 seconds. Two-sided fusing makes a much stronger piece for keychains, coasters and anything that will be handled.</p>
        <p>If you want a flat, glossy finish, iron both sides evenly. If you want a more textured look, leave the second side lightly fused. Either way, keep the iron moving.</p>

        <h2 id="cool">Cool it flat</h2>
        <p>While the piece is still warm and flexible, put it between two sheets of paper and press it under a heavy book for a few minutes. This is the simplest way to stop curling. Do not bend or test the piece while it is warm; let it cool completely before you attach a keyring or glue a magnet.</p>

        <h2 id="troubleshooting">Troubleshooting</h2>
        <div class="table-wrap">
          <table class="beads">
            <thead><tr><th>Problem</th><th>Likely cause</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>Piece curls</td><td>Uneven heat or cooling while warm</td><td>Iron evenly, then press flat under a book while it cools.</td></tr>
              <tr><td>Beads did not fuse</td><td>Iron too cool or too little time</td><td>Cover and iron again in short bursts, checking every few seconds.</td></tr>
              <tr><td>Beads melted flat</td><td>Iron too hot or held in one spot</td><td>Lower the heat and keep the iron moving. Test on a scrap first.</td></tr>
              <tr><td>Paper stuck to beads</td><td>Wrong paper or too much heat</td><td>Let it cool completely, then peel slowly. Use proper ironing paper next time.</td></tr>
              <tr><td>One section is weak</td><td>Uneven pressure</td><td>Re-cover that area and apply light, even heat for a few seconds.</td></tr>
            </tbody>
          </table>
        </div>

        <h2 id="faq">Ironing questions</h2>
        ${faq(faqs)}
      </div>
      <aside class="guide-aside">
        <h3>On this page</h3>
        <ul>
          <li><a href="#supplies">What you need</a></li>
          <li><a href="#temperature">Set the iron</a></li>
          <li><a href="#first-side">Iron the first side</a></li>
          <li><a href="#second-side">Flip and iron the second side</a></li>
          <li><a href="#cool">Cool it flat</a></li>
          <li><a href="#troubleshooting">Troubleshooting</a></li>
          <li><a href="#faq">Questions</a></li>
        </ul>
        <div class="note">
          <p><strong>Make a chart first.</strong> A coded pattern keeps the beads in the right order while you work.</p>
          <p><a class="btn btn--small" href="/#tool">Open the maker</a></p>
        </div>
      </aside>
    </div>
  </section>

  ${keepGoing("iron")}

  ${ctaBand("Ready to fuse something?", "Make a coded perler pattern, then follow the guide for a flat finish.", "/#tool", "Make a pattern")}
</main>
${footer()}
${scripts({})}
</body>
</html>`;
}

function notFoundPage() {
  return head({
    title: "Page not found – Bead Pattern Maker",
    desc: "That page is not here. Browse perler bead designs, printable patterns or open the pattern maker.",
    path: "/404.html",
    active: "",
    schema: null
  }) + `<main id="main">
  <section class="wrap not-found">
    <div class="bead-row" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <p class="eyebrow">404 · misplaced bead</p>
    <h1>This peg is empty</h1>
    <p class="lede">The page you asked for is not here. It may have moved, or the link may have a typo. Try one of these instead:</p>
    <p style="margin-top:24px">
      <a class="btn btn--primary" href="/">Pattern maker</a>
      ${CONTENT_PAGES.map(Pages.page).filter(function (p) { return Pages.isLive(p.path); }).slice(0, 2).map(function (p) {
        return `<a class="btn" href="${p.path}">${esc(capitalise(p.keyword))}</a>`;
      }).join("\n      ")}
    </p>
  </section>
</main>
${footer()}
${scripts({})}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

function blankPattern(w, h) {
  return {
    w: w,
    h: h,
    cells: new Int16Array(w * h).fill(0),
    counts: [w * h],
    total: w * h,
    palette: { colors: [{ code: "W", name: "Blank", hex: "#FFFFFF" }] }
  };
}

function buildAssets() {
  // favicon — a five-by-five pegboard with a few seated beads
  const iconColours = {
    1: "#2747e8", 6: "#d8ff3e", 8: "#ff4f9a", 11: "#2fd3e2",
    15: "#2747e8", 18: "#ff4f9a", 22: "#d8ff3e"
  };
  let iconDots = "";
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const i = row * 5 + col;
      iconDots += `<circle cx="${13 + col * 9.5}" cy="${13 + row * 9.5}" r="3.6" fill="${iconColours[i] || "#d2dce3"}" stroke="#101418" stroke-width="1.2"/>`;
    }
  }
  write("assets/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#f2f5f7"/>
  <rect x="6" y="6" width="52" height="52" fill="#ffffff" stroke="#101418" stroke-width="2"/>
  ${iconDots}
</svg>
`);

  // touch icon using the same five-by-five mark
  write("assets/apple-touch-icon.png", png(180, 180, function (x, y) {
    const bg = hexRgb("#f2f5f7");
    const panel = hexRgb("#ffffff");
    const ink = hexRgb("#101418");
    const dot = hexRgb("#d2dce3");
    const colours = {
      1: "#2747e8", 6: "#d8ff3e", 8: "#ff4f9a", 11: "#2fd3e2",
      15: "#2747e8", 18: "#ff4f9a", 22: "#d8ff3e"
    };
    let out = bg;
    if (x >= 17 && x <= 162 && y >= 17 && y <= 162) out = panel;
    if (x <= 18 || x >= 161 || y <= 18 || y >= 161) {
      if (x >= 17 && x <= 162 && y >= 17 && y <= 162) out = ink;
    }
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const i = row * 5 + col;
        const cx = 38 + col * 26;
        const cy = 38 + row * 26;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= 9) out = colours[i] ? hexRgb(colours[i]) : dot;
        else if (d <= 10.4) out = ink;
      }
    }
    return out;
  }));

  // Social card: use the branded screenshot when it exists, otherwise keep a
  // generated fallback so a clean build still has a valid og:image.
  const fallback = socialCard();
  write("assets/og-fallback.png", fallback);
  if (!fs.existsSync(path.join(root, "assets/og.png"))) {
    write("assets/og.png", fallback);
  }

  // design previews
  BPMPatterns.LIST.forEach(function (def) {
    write(designFile(def, "svg"), patternSvg(def));
  });

  // pattern PDFs
  BPMPatterns.LIST.forEach(function (def) {
    const pattern = patternFor(def);
    const bytes = BPMPDF.build(pattern, {
      title: def.name + " — perler bead pattern",
      site: "beadpatternmaker.io"
    });
    write(designFile(def, "pdf"), Buffer.from(bytes));
  });

  // template SVGs and PDFs
  TEMPLATES.forEach(function (t) {
    write(templateFile(t, "svg"), templateSvg(t));
    const bytes = BPMPDF.build(blankPattern(t.w, t.h), {
      title: t.name + " — blank perler bead template",
      site: "beadpatternmaker.io",
      blank: true,
      showCodes: false
    });
    write(templateFile(t, "pdf"), Buffer.from(bytes));
  });

  // manifest
  write("manifest.webmanifest", JSON.stringify({
    name: "Bead Pattern Maker",
    short_name: "Bead Pattern",
    description: "Turn a photo into a coded perler bead pattern and print it.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f5f7",
    theme_color: "#f2f5f7",
    icons: [
      { src: "/assets/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }, null, 2) + "\n");
}

function buildPages() {
  write("index.html", homePage());
  write("perler-bead-designs/index.html", designsPage());
  write("fuse-bead-ideas/index.html", ideasPage());
  write("fuse-bead-patterns/index.html", patternsPage());
  write("perler-bead-templates/index.html", templatesPage());
  write("perler-bead-maker/index.html", makerPage());
  write("perler-bead-generator/index.html", generatorPage());
  write("fuse-bead-pattern-maker/index.html", fuseMakerPage());
  write("how-to-iron-perler-beads/index.html", ironGuidePage());
  write("404.html", notFoundPage());
}

function buildSitemap() {
  const urls = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/perler-bead-designs/", priority: "0.9", changefreq: "weekly", images: BPMPatterns.LIST.map(function (d) { return { loc: designFile(d, "svg"), title: d.name + " perler bead design" }; }) },
    { loc: "/fuse-bead-ideas/", priority: "0.9", changefreq: "weekly" },
    { loc: "/fuse-bead-patterns/", priority: "0.9", changefreq: "weekly" },
    { loc: "/perler-bead-templates/", priority: "0.8", changefreq: "monthly" },
    { loc: "/perler-bead-maker/", priority: "0.8", changefreq: "monthly" },
    { loc: "/perler-bead-generator/", priority: "0.7", changefreq: "monthly" },
    { loc: "/fuse-bead-pattern-maker/", priority: "0.7", changefreq: "monthly" },
    { loc: "/how-to-iron-perler-beads/", priority: "0.8", changefreq: "monthly" }
  ].filter(function (u) { return Pages.isLive(u.loc); });
  const body = urls.map(function (u) {
    let s = `  <url>
    <loc>${SITE}${u.loc}</loc>
    <lastmod>${UPDATED}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>`;
    if (u.images) {
      u.images.forEach(function (img) {
        s += `
    <image:image>
      <image:loc>${SITE}${img.loc}</image:loc>
      <image:title>${esc(img.title)}</image:title>
    </image:image>`;
      });
    }
    s += `
  </url>`;
    return s;
  }).join("\n");
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`);
  write("robots.txt", `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
}

function main() {
  // Start the generated asset folders empty so renamed or removed designs do
  // not leave stale files behind.
  ["assets/designs", "assets/pdfs", "assets/templates"].forEach(function (dir) {
    fs.rmSync(path.join(root, dir), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  });
  buildAssets();
  buildPages();
  buildSitemap();
  console.log("built " + (BPMPatterns.LIST.length) + " designs, " + TEMPLATES.length + " templates");
  console.log("pages: 10 · sitemap · image assets · PDFs");
  console.log("live (wave " + Pages.LIVE_WAVE + "): " + Pages.livePages().map(function (p) { return p.path; }).join(" "));
  console.log("site root: " + root);
}

main();
