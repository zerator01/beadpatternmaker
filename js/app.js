/* Bead Pattern Maker tool: photo -> editable coded chart -> PNG / PDF / CSV / link.
   The same script powers the homepage and the standalone tool pages. A page can
   set window.BPM_TOOL before loading this file to change its starting settings. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var CFG = window.BPM_TOOL || {};
  var DEFAULTS = {
    palette: CFG.palette || "perler",
    cols: CFG.cols || 32,
    rows: CFG.rows || "square",
    maxColors: CFG.maxColors || 18
  };

  var els = {
    drop: $("drop"),
    file: $("file"),
    fileName: $("fileName"),
    sample: $("sample"),
    reset: $("reset"),
    width: $("width"),
    widthVal: $("widthVal"),
    rows: $("rows"),
    palette: $("palette"),
    dither: $("dither"),
    cropPanel: $("cropPanel"),
    cropCanvas: $("cropCanvas"),
    cropZoom: $("cropZoom"),
    cropZoomVal: $("cropZoomVal"),
    cropCenter: $("cropCenter"),
    cropReset: $("cropReset"),
    maxColors: $("maxColors"),
    maxColorsVal: $("maxColorsVal"),
    stash: $("stash"),
    dropBg: $("dropBg"),
    preview: $("preview"),
    shell: document.querySelector(".preview-shell"),
    stats: $("stats"),
    legend: $("legend"),
    editorBar: $("editorBar"),
    paletteStrip: $("paletteStrip"),
    undo: $("undo"),
    redo: $("redo"),
    dlPng: $("dlPng"),
    dlPdf: $("dlPdf"),
    dlCsv: $("dlCsv"),
    shareLink: $("shareLink"),
    actualSize: $("actualSize"),
    empty: $("emptyState"),
    status: $("status")
  };

  if (!els.preview) return;

  var STORE_KEY = "bpm:last";

  var state = {
    img: null,
    fileName: "",
    pattern: null,
    paletteKey: DEFAULTS.palette,
    cols: DEFAULTS.cols,
    rowsMode: DEFAULTS.rows,
    dither: false,
    allowed: null,
    maxColors: DEFAULTS.maxColors,
    dropBg: false,
    tool: "paint",
    active: 0,
    history: [],
    hIndex: -1,
    hovering: null,
    stroking: false,
    strokeDirty: false,
    cell: 18,
    pad: 10,
    restored: false,
    crop: { cx: 0.5, cy: 0.5, zoom: 1 },
    cropGeom: null,
    cropDrag: null
  };

  var timers = { generate: null, hover: 0, save: null };

  // ---------- UI scaffolding ----------

  (function fillPalettes() {
    for (var key in BPMPalettes.PALETTES) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = BPMPalettes.PALETTES[key].label;
      els.palette.appendChild(opt);
    }
    els.palette.value = state.paletteKey;
  })();

  function palette() {
    return BPMPalettes.get(state.paletteKey);
  }

  function buildStash() {
    if (!els.stash) return;
    var colors = palette().colors;
    var html = "";
    for (var i = 0; i < colors.length; i++) {
      var on = !state.allowed || state.allowed[i] !== false;
      html += '<button type="button" class="stash-bead" data-index="' + i +
        '" aria-pressed="' + (on ? "true" : "false") + '" style="--bead:' + colors[i].hex +
        '" title="' + colors[i].name + '"></button>';
    }
    els.stash.innerHTML = html;
    els.stash.setAttribute("data-palette", state.paletteKey);
  }

  function buildStrip() {
    if (!els.paletteStrip) return;
    var colors = palette().colors;
    var html = "";
    for (var i = 0; i < colors.length; i++) {
      html += '<button type="button" data-index="' + i + '" aria-pressed="' +
        (i === state.active ? "true" : "false") + '" style="--bead:' + colors[i].hex +
        '" title="' + colors[i].name + ' (' + colors[i].code + ')"><span class="sr-only">' +
        colors[i].name + "</span></button>";
    }
    els.paletteStrip.innerHTML = html;
  }

  buildStash();
  buildStrip();

  // ---------- helpers ----------

  function say(msg) {
    if (els.status) els.status.textContent = msg;
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function baseName() {
    var n = (state.fileName || "bead-pattern").replace(/\.[a-z0-9]+$/i, "");
    return n.replace(/[^a-z0-9\-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "bead-pattern";
  }

  /** On a phone, bring the freshly generated chart under the header. */
  function revealChart() {
    if (window.innerWidth > 820 || !els.shell) return;
    setTimeout(function () {
      var top = els.shell.getBoundingClientRect().top + window.scrollY - 78;
      if (window.scrollY < top - 40) {
        window.scrollTo({ top: top, behavior: "smooth" });
      }
    }, 140);
  }

  function requiresImage() {
    if (state.img) return true;
    say("This chart came from a design or link. Upload a photo to rebuild it at a new size.");
    return false;
  }

  // ---------- image handling ----------

  function loadImage(file) {
    if (!file || !/^image\//.test(file.type)) {
      say("That file is not an image. Try a JPG, PNG or WEBP.");
      return;
    }
    state.fileName = file.name || "photo";
    els.fileName.textContent = state.fileName;
    els.drop.classList.add("has-file");

    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      state.img = img;
      state.restored = false;
      state.crop = { cx: 0.5, cy: 0.5, zoom: 1 };
      syncCropUI();
      if (els.cropPanel) els.cropPanel.hidden = false;
      els.reset.disabled = false;
      generate();
      revealChart();
      say("Pattern ready. Click any bead to change it. " + img.naturalWidth + " x " + img.naturalHeight + " px source.");
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      say("Could not read that image. Try exporting it as PNG or JPG first.");
    };
    img.src = url;
  }

  function resolvedRows(img, cols, fixedRows) {
    if (state.rowsMode === "square") return Math.max(4, Math.min(110, cols));
    var aspect = img.naturalHeight / img.naturalWidth;
    var rows = fixedRows > 0 ? fixedRows : Math.round(cols * aspect);
    return Math.max(4, Math.min(110, rows));
  }

  function gridAspect() {
    if (state.pattern) return state.pattern.w / state.pattern.h;
    if (!state.img) return 1;
    var fixed = state.rowsMode === "auto" || state.rowsMode === "square"
      ? 0 : parseInt(state.rowsMode, 10);
    var rows = resolvedRows(state.img, state.cols, fixed);
    return state.cols / rows;
  }

  /** Downsample the photo to one average colour per bead. */
  function imageToCells(img, cols, fixedRows) {
    var rows = resolvedRows(img, cols, fixedRows);

    var SS = 4;
    var cw = cols * SS;
    var ch = rows * SS;

    var c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, cw, ch);

    var crop = BPMFrame.rect(img.naturalWidth, img.naturalHeight, cols / rows, state.crop);
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, cw, ch);

    var src = ctx.getImageData(0, 0, cw, ch).data;
    var out = new Uint8ClampedArray(cols * rows * 4);

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var r = 0, g = 0, b = 0, a = 0;
        for (var yy = 0; yy < SS; yy++) {
          var rowOff = (y * SS + yy) * cw;
          for (var xx = 0; xx < SS; xx++) {
            var p = (rowOff + x * SS + xx) * 4;
            var al = src[p + 3];
            r += src[p] * al;
            g += src[p + 1] * al;
            b += src[p + 2] * al;
            a += al;
          }
        }
        var i = (y * cols + x) * 4;
        if (a > 0) {
          out[i] = r / a;
          out[i + 1] = g / a;
          out[i + 2] = b / a;
        }
        out[i + 3] = a / (SS * SS);
      }
    }

    return { pixels: out, w: cols, h: rows };
  }

  /**
   * Clear a plain background: flood fill from the border through colours close
   * to the corner colour. Bails out when the corners disagree (busy photo).
   * @returns {number} cells cleared
   */
  function dropBackground(cells) {
    var w = cells.w, h = cells.h, px = cells.pixels;
    var n = w * h;
    if (n < 9) return 0;

    var labs = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var lab = BPMQuant.rgbToLab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
      labs[i * 3] = lab[0];
      labs[i * 3 + 1] = lab[1];
      labs[i * 3 + 2] = lab[2];
    }

    var corners = [0, w - 1, (h - 1) * w, n - 1];
    var bg = [0, 0, 0];
    for (var c = 0; c < 4; c++) {
      bg[0] += labs[corners[c] * 3] / 4;
      bg[1] += labs[corners[c] * 3 + 1] / 4;
      bg[2] += labs[corners[c] * 3 + 2] / 4;
    }

    // corners must be roughly the same colour, otherwise this is not a backdrop
    var spread = 0;
    for (c = 0; c < 4; c++) {
      var d = distLab(labs, corners[c] * 3, bg);
      if (d > spread) spread = d;
    }
    if (spread > 26) return 0;

    var tol = 17;
    var seen = new Uint8Array(n);
    var stack = [];

    function consider(idx) {
      if (seen[idx]) return;
      if (distLab(labs, idx * 3, bg) > tol) return;
      seen[idx] = 1;
      stack.push(idx);
    }

    for (var x = 0; x < w; x++) {
      consider(x);
      consider((h - 1) * w + x);
    }
    for (var y = 0; y < h; y++) {
      consider(y * w);
      consider(y * w + w - 1);
    }

    var cleared = 0;
    while (stack.length) {
      var idx = stack.pop();
      px[idx * 4 + 3] = 0;
      cleared++;
      var cx = idx % w;
      var cy = (idx / w) | 0;
      if (cx > 0) consider(idx - 1);
      if (cx < w - 1) consider(idx + 1);
      if (cy > 0) consider(idx - w);
      if (cy < h - 1) consider(idx + w);
    }
    return cleared;
  }

  function distLab(labs, off, ref) {
    var dl = labs[off] - ref[0];
    var da = labs[off + 1] - ref[1];
    var db = labs[off + 2] - ref[2];
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  // ---------- generate ----------

  function generate() {
    if (!state.img) return;
    var pal = palette();
    var rows = state.rowsMode === "auto" || state.rowsMode === "square"
      ? 0 : parseInt(state.rowsMode, 10);
    var down = imageToCells(state.img, state.cols, rows);
    var cleared = state.dropBg ? dropBackground(down) : 0;

    var base = BPMQuant.quantizeCells(down.pixels, down.w, down.h, pal.colors, {
      dither: state.dither
    });
    var allowed = state.allowed && state.allowed.length === pal.colors.length
      ? state.allowed
      : null;
    var pattern = BPMQuant.reduce(base, { allowed: allowed, maxColors: state.maxColors });

    state.pattern = pattern;
    state.restored = false;
    resetHistory();

    // pick a sensible brush colour: the most used bead
    var used = BPMQuant.usedColors(pattern);
    if (used.length && pattern.counts[state.active] === 0) {
      state.active = used[0].index;
      syncStrip();
    }

    afterPattern();

    if (pattern.merges.length) {
      say("Merged " + pattern.merges.length + " colour" + (pattern.merges.length === 1 ? "" : "s") +
        " into the nearest bead you kept." + (cleared ? " Background cleared: " + cleared + " cells." : ""));
    } else if (cleared) {
      say("Background cleared: " + cleared + " cells. Click a bead to fix anything the photo got wrong.");
    }
    saveSoon();
  }

  function afterPattern() {
    drawPreview();
    updateStats();
    updateLegend();
    updateEditor();
    setExports(true);
    if (els.cropPanel && !els.cropPanel.hidden && els.cropPanel.open) drawCropCanvas();
    commit();
  }

  // ---------- rendering ----------

  function drawPreview() {
    var p = state.pattern;
    if (!p) return;

    var availW = Math.max(200, (els.shell.clientWidth || 520) - 34);
    var availH = Math.max(220, (els.shell.clientHeight || 420) - 54);
    var narrow = window.innerWidth <= 820;
    var cell = narrow
      ? Math.floor(availW / p.w)
      : Math.floor(Math.min(availW / p.w, availH / p.h));
    cell = Math.max(4, Math.min(38, cell));

    state.cell = cell;
    state.pad = 10;

    BPMRender.renderPattern(els.preview, p, {
      cell: cell,
      pad: state.pad,
      mode: "grid",
      codes: cell >= 15,
      gridLines: true,
      background: "#ffffff",
      dpr: Math.min(2, window.devicePixelRatio || 1),
      highlight: state.hovering
    });

    els.shell.classList.add("has-pattern");
  }

  function scheduleDraw() {
    if (timers.hover) return;
    timers.hover = requestAnimationFrame(function () {
      timers.hover = 0;
      drawPreview();
    });
  }

  function updateStats() {
    var p = state.pattern;
    var used = BPMQuant.usedColors(p);
    els.stats.innerHTML =
      "<span><b>" + p.w + "</b> × <b>" + p.h + "</b> beads</span>" +
      "<span><b>" + p.total + "</b> beads to place</span>" +
      "<span><b>" + used.length + "</b> colours</span>" +
      "<span>click to edit</span>";
    els.stats.hidden = false;
    els.stats.setAttribute("aria-live", "polite");
  }

  function updateLegend() {
    var used = BPMQuant.usedColors(state.pattern);
    var html = "";
    for (var i = 0; i < used.length; i++) {
      var u = used[i];
      html += '<span class="chip" title="' + u.name + '">' +
        '<span class="swatch" style="background:' + u.hex + '"></span>' +
        "<code>" + u.code + "</code> " + u.name + " <b>" + u.count + "</b></span>";
    }
    els.legend.innerHTML = html;
    els.legend.hidden = false;
  }

  function updateEditor() {
    if (!els.editorBar) return;
    els.editorBar.hidden = !state.pattern;
  }

  function syncStrip() {
    if (!els.paletteStrip) return;
    var btns = els.paletteStrip.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", String(Number(btns[i].getAttribute("data-index")) === state.active));
    }
  }

  // ---------- history ----------

  function snapshot() {
    var p = state.pattern;
    return {
      cells: new Int16Array(p.cells),
      counts: p.counts.slice(),
      total: p.total
    };
  }

  function commit() {
    if (!state.pattern) return;
    state.history = state.history.slice(0, state.hIndex + 1);
    state.history.push(snapshot());
    if (state.history.length > 60) state.history.shift();
    state.hIndex = state.history.length - 1;
    syncUndo();
  }

  function applySnapshot(snap) {
    var p = state.pattern;
    p.cells = new Int16Array(snap.cells);
    p.counts = snap.counts.slice();
    p.total = snap.total;
    drawPreview();
    updateStats();
    updateLegend();
    saveSoon();
  }

  function undo() {
    if (state.hIndex <= 0) return;
    state.hIndex--;
    applySnapshot(state.history[state.hIndex]);
    syncUndo();
    say("Undone.");
  }

  function redo() {
    if (state.hIndex >= state.history.length - 1) return;
    state.hIndex++;
    applySnapshot(state.history[state.hIndex]);
    syncUndo();
    say("Redone.");
  }

  function syncUndo() {
    if (els.undo) els.undo.disabled = state.hIndex <= 0;
    if (els.redo) els.redo.disabled = state.hIndex >= state.history.length - 1;
  }

  function resetHistory() {
    state.history = [];
    state.hIndex = -1;
  }

  // ---------- editing ----------

  function cellFromEvent(e) {
    var p = state.pattern;
    if (!p) return null;
    var rect = els.preview.getBoundingClientRect();
    if (!rect.width) return null;
    var cssW = parseFloat(els.preview.style.width) || rect.width;
    var scale = rect.width / cssW;
    var x = (e.clientX - rect.left) / scale;
    var y = (e.clientY - rect.top) / scale;
    var cx = Math.floor((x - state.pad) / state.cell);
    var cy = Math.floor((y - state.pad) / state.cell);
    if (cx < 0 || cy < 0 || cx >= p.w || cy >= p.h) return null;
    return { x: cx, y: cy };
  }

  function paint(x, y, idx) {
    var p = state.pattern;
    if (idx >= p.palette.colors.length) return false;
    var i = y * p.w + x;
    var prev = p.cells[i];
    if (prev === idx) return false;
    if (prev >= 0) p.counts[prev]--;
    if (idx >= 0) p.counts[idx]++;
    if (prev < 0 && idx >= 0) p.total++;
    else if (prev >= 0 && idx < 0) p.total--;
    p.cells[i] = idx;
    return true;
  }

  function pick(x, y) {
    var p = state.pattern;
    var idx = p.cells[y * p.w + x];
    if (idx < 0) return;
    state.active = idx;
    syncStrip();
    setTool("paint");
    say("Picked " + p.palette.colors[idx].name + ". Click beads to paint with it.");
  }

  function setTool(tool) {
    state.tool = tool;
    var btns = document.querySelectorAll("[data-tool]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", String(btns[i].getAttribute("data-tool") === tool));
    }
  }

  els.preview.addEventListener("pointerdown", function (e) {
    if (!state.pattern) return;
    var c = cellFromEvent(e);
    if (!c) return;

    if (state.tool === "pick") {
      pick(c.x, c.y);
      return;
    }

    e.preventDefault();
    els.preview.setPointerCapture(e.pointerId);
    state.stroking = true;
    state.strokeDirty = false;

    var idx = state.tool === "erase" ? -1 : state.active;
    if (e.button === 2) idx = -1;
    if (paint(c.x, c.y, idx)) state.strokeDirty = true;
    state.hovering = c;
    scheduleDraw();
  });

  els.preview.addEventListener("pointermove", function (e) {
    if (!state.pattern) return;
    var c = cellFromEvent(e);

    if (state.stroking) {
      if (!c) return;
      var idx = state.tool === "erase" ? -1 : state.active;
      if (paint(c.x, c.y, idx)) {
        state.strokeDirty = true;
        state.hovering = c;
        scheduleDraw();
      }
      return;
    }

    var changed = (c && (!state.hovering || c.x !== state.hovering.x || c.y !== state.hovering.y)) ||
      (!c && state.hovering);
    if (changed) {
      state.hovering = c;
      scheduleDraw();
    }
  });

  function endStroke() {
    if (!state.stroking) return;
    state.stroking = false;
    if (state.strokeDirty) {
      commit();
      updateStats();
      updateLegend();
      saveSoon();
    }
  }

  els.preview.addEventListener("pointerup", endStroke);
  els.preview.addEventListener("pointercancel", endStroke);
  els.preview.addEventListener("pointerleave", function () {
    if (state.stroking) return;
    if (state.hovering) {
      state.hovering = null;
      scheduleDraw();
    }
  });
  els.preview.addEventListener("contextmenu", function (e) {
    if (!state.pattern) return;
    // right-drag already erases through pointerdown; just suppress the menu
    e.preventDefault();
  });

  document.addEventListener("keydown", function (e) {
    if (!state.pattern) return;
    var mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (mod) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.key === "p") setTool("paint");
    else if (e.key === "e") setTool("erase");
    else if (e.key === "i") setTool("pick");
    else if (e.key === "[" || e.key === "]") {
      var n = palette().colors.length;
      state.active = (state.active + (e.key === "]" ? 1 : n - 1)) % n;
      syncStrip();
    }
  });

  // ---------- crop / framing ----------

  function clampCrop() {
    var img = state.img;
    if (!img) return;
    // rect() clamps internally; read the effective centre back into state
    var r = BPMFrame.rect(img.naturalWidth, img.naturalHeight, gridAspect(), state.crop);
    state.crop.cx = r.nx + r.nw / 2;
    state.crop.cy = r.ny + r.nh / 2;
  }

  function syncCropUI() {
    if (!els.cropZoom) return;
    els.cropZoom.value = String(state.crop.zoom);
    if (els.cropZoomVal) els.cropZoomVal.textContent = state.crop.zoom.toFixed(1);
  }

  function resetCrop() {
    state.crop = { cx: 0.5, cy: 0.5, zoom: 1 };
    syncCropUI();
    drawCropCanvas();
    if (state.img) scheduleGenerate();
  }

  function drawCropCanvas() {
    var img = state.img;
    var canvas = els.cropCanvas;
    if (!img || !canvas || !els.cropPanel || !els.cropPanel.open) return;

    var box = canvas.getBoundingClientRect();
    var W = Math.max(1, Math.round(box.width));
    var H = Math.max(1, Math.round(box.height));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    var dw = img.naturalWidth * s;
    var dh = img.naturalHeight * s;
    var ox = (W - dw) / 2;
    var oy = (H - dh) / 2;

    ctx.drawImage(img, ox, oy, dw, dh);
    state.cropGeom = { ox: ox, oy: oy, dw: dw, dh: dh };

    var r = BPMFrame.rect(img.naturalWidth, img.naturalHeight, gridAspect(), state.crop);
    var x = ox + r.nx * dw;
    var y = oy + r.ny * dh;
    var w = r.nw * dw;
    var h = r.nh * dh;

    ctx.fillStyle = "rgba(20, 16, 13, 0.62)";
    ctx.fillRect(0, 0, W, y);
    ctx.fillRect(0, y + h, W, H - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, W - x - w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
    ctx.strokeStyle = "rgba(20,16,13,0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (var i = 1; i < 3; i++) {
      var gx = x + (w * i) / 3;
      var gy = y + (h * i) / 3;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
  }

  if (els.cropPanel) {
    els.cropPanel.addEventListener("toggle", function () {
      if (els.cropPanel.open) requestAnimationFrame(drawCropCanvas);
    });
  }

  if (els.cropCanvas) {
    els.cropCanvas.addEventListener("pointerdown", function (e) {
      if (!state.img) return;
      e.preventDefault();
      els.cropCanvas.setPointerCapture(e.pointerId);
      state.cropDrag = {
        x: e.clientX,
        y: e.clientY,
        cx: state.crop.cx,
        cy: state.crop.cy
      };
    });

    els.cropCanvas.addEventListener("pointermove", function (e) {
      if (!state.cropDrag || !state.cropGeom) return;
      var g = state.cropGeom;
      if (!g.dw || !g.dh) return;
      state.crop.cx = state.cropDrag.cx + (e.clientX - state.cropDrag.x) / g.dw;
      state.crop.cy = state.cropDrag.cy + (e.clientY - state.cropDrag.y) / g.dh;
      clampCrop();
      drawCropCanvas();
      scheduleGenerate();
    });

    function endCropDrag() {
      state.cropDrag = null;
    }
    els.cropCanvas.addEventListener("pointerup", endCropDrag);
    els.cropCanvas.addEventListener("pointercancel", endCropDrag);
  }

  if (els.cropZoom) {
    els.cropZoom.addEventListener("input", function () {
      state.crop.zoom = parseFloat(els.cropZoom.value) || 1;
      if (els.cropZoomVal) els.cropZoomVal.textContent = state.crop.zoom.toFixed(1);
      clampCrop();
      drawCropCanvas();
      scheduleGenerate();
    });
  }

  if (els.cropCenter) {
    els.cropCenter.addEventListener("click", function () {
      state.crop.cx = 0.5;
      state.crop.cy = 0.5;
      drawCropCanvas();
      if (state.img) scheduleGenerate();
    });
  }

  if (els.cropReset) {
    els.cropReset.addEventListener("click", resetCrop);
  }

  // ---------- persistence ----------

  function saveSoon() {
    clearTimeout(timers.save);
    timers.save = setTimeout(save, 500);
  }

  function save() {
    if (!state.pattern) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        p: BPMShare.encode(state.pattern, state.paletteKey),
        path: location.pathname,
        name: state.fileName || "",
        allowed: state.allowed,
        maxColors: state.maxColors,
        dropBg: state.dropBg
      }));
    } catch (err) {
      /* private mode or quota: editing still works, just no autosave */
    }
  }

  function restore(pattern, paletteKey, name) {
    state.pattern = pattern;
    state.paletteKey = paletteKey;
    els.palette.value = paletteKey;
    state.fileName = name || "";
    els.fileName.textContent = name || "restored chart";
    state.restored = true;
    buildStash();
    buildStrip();
    resetHistory();
    var used = BPMQuant.usedColors(pattern);
    state.active = used.length ? used[0].index : 0;
    if (state.active >= pattern.palette.colors.length) state.active = 0;
    syncStrip();
    afterPattern();
  }

  function restoreFromHash() {
    var m = (location.hash || "").match(/^#p=(.+)$/);
    if (!m) return false;
    var decoded = BPMShare.decode(m[1]);
    if (!decoded) return false;
    var pal = BPMPalettes.get(decoded.paletteKey);
    restore(BPMShare.toPattern(decoded, pal), pal.id, "");
    say("Opened a shared pattern. Upload a photo to make a new one, or just print this one.");
    return true;
  }

  function restoreFromStore() {
    var raw;
    try { raw = localStorage.getItem(STORE_KEY); } catch (err) { return false; }
    if (!raw) return false;
    var data;
    try { data = JSON.parse(raw); } catch (err) { return false; }
    if (!data || !data.p) return false;
    // Each page has its own palette / grid defaults. Only restore a chart on
    // the page that saved it, otherwise the homepage's Perler chart would
    // override the Hama setup on /fuse-bead-pattern-maker/.
    if (data.path && data.path !== location.pathname) return false;
    if (!data.path && location.pathname !== "/") return false;
    var decoded = BPMShare.decode(data.p);
    if (!decoded) return false;
    var pal = BPMPalettes.get(decoded.paletteKey);
    if (Array.isArray(data.allowed) && data.allowed.length === pal.colors.length) {
      state.allowed = data.allowed.map(Boolean);
    }
    if (data.maxColors >= 2) {
      state.maxColors = data.maxColors;
      if (els.maxColors) {
        els.maxColors.value = String(data.maxColors);
        if (els.maxColorsVal) els.maxColorsVal.textContent = String(data.maxColors);
      }
    }
    if (data.dropBg && els.dropBg) {
      state.dropBg = true;
      els.dropBg.checked = true;
    }
    restore(BPMShare.toPattern(decoded, pal), pal.id, data.name);
    els.reset.disabled = false;
    say("Picked up where you left off. Upload a photo to start a new pattern.");
    return true;
  }

  // ---------- exports ----------

  els.dlPng.addEventListener("click", function () {
    var p = state.pattern;
    if (!p) return;
    var cell = Math.min(46, Math.max(12, Math.floor(1600 / p.w)));
    var canvas = BPMRender.toCanvas(p, {
      cell: cell,
      pad: 28,
      mode: "grid",
      codes: cell >= 14,
      gridLines: true,
      background: "#ffffff",
      dpr: 2
    });
    canvas.toBlob(function (blob) {
      download(blob, baseName() + "-" + p.w + "x" + p.h + ".png");
      say("PNG saved at " + canvas.width + " x " + canvas.height + " px.");
    }, "image/png");
  });

  els.dlPdf.addEventListener("click", function () {
    var p = state.pattern;
    if (!p) return;
    els.dlPdf.disabled = true;
    say("Building your print-ready PDF…");
    setTimeout(function () {
      try {
        var bytes = BPMPDF.build(p, {
          title: state.fileName || "Bead pattern",
          cellPt: els.actualSize && els.actualSize.checked ? 14.173 : 0
        });
        download(new Blob([bytes], { type: "application/pdf" }), baseName() + "-" + p.w + "x" + p.h + ".pdf");
        say("PDF saved. Print at 100% — each colour has a code, and the last page is your bead list.");
      } catch (err) {
        say("Sorry — the PDF failed (" + err.message + "). The PNG export still works.");
      }
      els.dlPdf.disabled = false;
    }, 40);
  });

  els.dlCsv.addEventListener("click", function () {
    var p = state.pattern;
    if (!p) return;
    var used = BPMQuant.usedColors(p);
    var lines = ["code,name,hex,beads"];
    for (var i = 0; i < used.length; i++) {
      lines.push([used[i].code, '"' + used[i].name + '"', used[i].hex, used[i].count].join(","));
    }
    lines.push("total,,," + p.total);
    download(new Blob([lines.join("\n") + "\n"], { type: "text/csv" }), baseName() + "-bead-list.csv");
    say("Bead list saved as CSV.");
  });

  els.shareLink.addEventListener("click", function () {
    var p = state.pattern;
    if (!p) return;
    var code = BPMShare.encode(p, state.paletteKey);
    var url = location.origin + location.pathname + "#p=" + code;
    history.replaceState(null, "", "#p=" + code);
    var done = function () { say("Link copied. It contains the whole chart — paste it anywhere."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url, done); });
    } else {
      fallbackCopy(url, done);
    }
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (err) { say("Copy failed — the link is in the address bar."); }
    ta.remove();
  }

  // ---------- inputs ----------

  els.file.addEventListener("change", function () {
    if (els.file.files && els.file.files[0]) loadImage(els.file.files[0]);
  });

  els.drop.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.file.click();
    }
  });

  ["dragenter", "dragover"].forEach(function (evt) {
    els.drop.addEventListener(evt, function (e) {
      e.preventDefault();
      els.drop.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    els.drop.addEventListener(evt, function (e) {
      e.preventDefault();
      els.drop.classList.remove("is-drag");
    });
  });
  els.drop.addEventListener("drop", function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) loadImage(dt.files[0]);
  });

  document.addEventListener("paste", function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") === 0) {
        var file = items[i].getAsFile();
        if (file) { loadImage(file); break; }
      }
    }
  });

  function sampleImage() {
    var c = document.createElement("canvas");
    c.width = 720;
    c.height = 720;
    var ctx = c.getContext("2d");

    var bg = ctx.createLinearGradient(0, 0, 720, 720);
    bg.addColorStop(0, "#c6eadf");
    bg.addColorStop(0.55, "#f7dca8");
    bg.addColorStop(1, "#ef9f9d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 720, 720);

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (var dotY = 42; dotY < 720; dotY += 58) {
      for (var dotX = 42; dotX < 720; dotX += 58) {
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // stem + two leaves
    ctx.strokeStyle = "#2f8a50";
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(360, 392);
    ctx.bezierCurveTo(338, 500, 378, 584, 354, 690);
    ctx.stroke();

    function leaf(cx, cy, rx, ry, rot, fill) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "#1e6b3c";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    }
    leaf(300, 555, 68, 30, -0.55, "#68c777");
    leaf(405, 610, 74, 32, 0.48, "#4aad64");

    // eight petals
    var petals = 8;
    for (var i = 0; i < petals; i++) {
      var angle = (i / petals) * Math.PI * 2 - Math.PI / 2;
      var px = 360 + Math.cos(angle) * 150;
      var py = 315 + Math.sin(angle) * 150;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);
      var grad = ctx.createLinearGradient(0, -78, 0, 78);
      grad.addColorStop(0, "#fffdf6");
      grad.addColorStop(1, "#e7d8ef");
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 116, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#8e6d9c";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.restore();
    }

    var centre = ctx.createRadialGradient(330, 282, 12, 360, 315, 96);
    centre.addColorStop(0, "#ffe98a");
    centre.addColorStop(1, "#e4a51f");
    ctx.beginPath();
    ctx.arc(360, 315, 92, 0, Math.PI * 2);
    ctx.fillStyle = centre;
    ctx.fill();
    ctx.strokeStyle = "#8b5c17";
    ctx.lineWidth = 9;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(330, 286, 28, 17, -0.6, 0, Math.PI * 2);
    ctx.fill();

    var img = new Image();
    img.onload = function () {
      state.img = img;
      state.fileName = "sample-daisy";
      state.crop = { cx: 0.5, cy: 0.5, zoom: 1 };
      syncCropUI();
      if (els.cropPanel) els.cropPanel.hidden = false;
      els.fileName.textContent = "sample: daisy photo";
      els.reset.disabled = false;
      generate();
      revealChart();
      say("Sample loaded. Click beads to edit, or drop your own photo.");
    };
    img.src = c.toDataURL("image/png");
  }

  els.sample.addEventListener("click", sampleImage);
  if (els.empty) els.empty.addEventListener("click", sampleImage);

  els.reset.addEventListener("click", function () {
    state.img = null;
    state.pattern = null;
    state.fileName = "";
    state.restored = false;
    state.history = [];
    state.hIndex = -1;
    state.allowed = null;
    state.maxColors = DEFAULTS.maxColors;
    state.dropBg = false;
    state.active = 0;
    setTool("paint");
    if (els.maxColors) {
      els.maxColors.value = String(DEFAULTS.maxColors);
      if (els.maxColorsVal) els.maxColorsVal.textContent = String(DEFAULTS.maxColors);
    }
    if (els.dropBg) els.dropBg.checked = false;
    buildStash();
    els.file.value = "";
    els.fileName.textContent = "JPG, PNG or WEBP · drop a photo or paste it";
    els.shell.classList.remove("has-pattern");
    els.stats.hidden = true;
    els.legend.hidden = true;
    els.editorBar.hidden = true;
    if (els.cropPanel) els.cropPanel.hidden = true;
    state.crop = { cx: 0.5, cy: 0.5, zoom: 1 };
    syncCropUI();
    els.reset.disabled = true;
    setExports(false);
    els.preview.width = 10;
    els.preview.height = 10;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    history.replaceState(null, "", location.pathname);
    say("Cleared. Drop a new photo to start again.");
  });

  function setExports(on) {
    els.dlPng.disabled = !on;
    els.dlPdf.disabled = !on;
    els.dlCsv.disabled = !on;
    els.shareLink.disabled = !on;
  }

  function scheduleGenerate() {
    clearTimeout(timers.generate);
    timers.generate = setTimeout(function () {
      if (!requiresImage()) return;
      generate();
    }, 120);
  }

  els.width.addEventListener("input", function () {
    state.cols = parseInt(els.width.value, 10);
    els.widthVal.textContent = state.cols;
    scheduleGenerate();
  });

  els.rows.addEventListener("change", function () {
    state.rowsMode = els.rows.value;
    scheduleGenerate();
  });

  els.palette.addEventListener("change", function () {
    state.paletteKey = els.palette.value;
    state.allowed = null;
    buildStash();
    buildStrip();
    scheduleGenerate();
  });

  els.dither.addEventListener("change", function () {
    state.dither = els.dither.checked;
    scheduleGenerate();
  });

  if (els.dropBg) {
    els.dropBg.addEventListener("change", function () {
      state.dropBg = els.dropBg.checked;
      scheduleGenerate();
    });
  }

  if (els.maxColors) {
    els.maxColors.addEventListener("input", function () {
      state.maxColors = parseInt(els.maxColors.value, 10);
      els.maxColorsVal.textContent = state.maxColors;
      scheduleGenerate();
    });
  }

  if (els.stash) {
    els.stash.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-index]");
      if (!btn) return;
      var i = Number(btn.getAttribute("data-index"));
      if (!state.allowed) state.allowed = palette().colors.map(function () { return true; });
      state.allowed[i] = !state.allowed[i];
      btn.setAttribute("aria-pressed", String(state.allowed[i]));
      scheduleGenerate();
    });
  }

  if (els.paletteStrip) {
    els.paletteStrip.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-index]");
      if (!btn) return;
      state.active = Number(btn.getAttribute("data-index"));
      syncStrip();
      setTool("paint");
    });
  }

  var toolButtons = document.querySelectorAll("[data-tool]");
  for (var t = 0; t < toolButtons.length; t++) {
    toolButtons[t].addEventListener("click", function (e) {
      setTool(e.currentTarget.getAttribute("data-tool"));
    });
  }

  if (els.undo) els.undo.addEventListener("click", undo);
  if (els.redo) els.redo.addEventListener("click", redo);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawPreview, 150);
  });

  // ---------- boot ----------
  (function featureChart() {
    var canvas = document.getElementById("featureChart");
    if (!canvas || typeof BPMPatterns === "undefined") return;
    var p = BPMPatterns.toPattern(BPMPatterns.LIST[0], BPMPalettes.get("perler"));
    BPMRender.renderPattern(canvas, p, {
      cell: 26,
      pad: 14,
      mode: "grid",
      codes: true,
      gridLines: true,
      background: "#ffffff",
      dpr: Math.min(2, window.devicePixelRatio || 1),
      highlight: { x: 4, y: 4 }
    });
    canvas.style.width = "100%";
    canvas.style.height = "auto";
  })();

  function syncControls() {
    if (els.width) {
      els.width.value = String(state.cols);
      if (els.widthVal) els.widthVal.textContent = String(state.cols);
    }
    if (els.rows) els.rows.value = state.rowsMode;
    if (els.palette) els.palette.value = state.paletteKey;
    if (els.maxColors) {
      els.maxColors.value = String(state.maxColors);
      if (els.maxColorsVal) els.maxColorsVal.textContent = String(state.maxColors);
    }
  }

  function loadDesignFromQuery() {
    var params = new URLSearchParams(location.search);
    var slug = params.get("design");
    if (!slug || typeof BPMPatterns === "undefined") return false;
    var def = BPMPatterns.find(slug);
    if (!def) return false;
    var pal = BPMPalettes.get("perler");
    state.paletteKey = "perler";
    state.maxColors = Math.max(2, Math.min(26, DEFAULTS.maxColors));
    restore(BPMPatterns.toPattern(def, pal), "perler", def.name);
    state.pattern.def = def;
    state.pattern.recipe = def;
    state.img = null;
    state.cols = def.rows[0].length;
    state.rowsMode = "auto";
    if (els.width) {
      els.width.value = String(state.cols);
      if (els.widthVal) els.widthVal.textContent = String(state.cols);
    }
    if (els.rows) els.rows.value = "auto";
    els.fileName.textContent = "design: " + def.name;
    els.reset.disabled = false;
    if (els.cropPanel) els.cropPanel.hidden = true;
    els.preview.scrollIntoView({ behavior: "smooth", block: "center" });
    say("Opened the " + def.name + " pattern. Upload a photo to make your own version.");
    return true;
  }

  syncControls();
  setExports(false);
  if (!restoreFromHash()) {
    if (!loadDesignFromQuery()) {
      if (!restoreFromStore()) {
        state.pattern = null;
      }
    }
  }
})();
