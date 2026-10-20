/* Colour quantisation: map averaged pixels onto a bead palette.
   Pure JS, no DOM — testable in Node. */
var BPMQuant = (function () {
  "use strict";

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function srgbToLinear(v) {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function rgbToLab(r, g, b) {
    var R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
    var X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    var Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
    var Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
    function f(t) {
      return t > 0.008856451679035631 ? Math.cbrt(t) : 7.787037037037035 * t + 16 / 116;
    }
    var fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function nearestLab(lab, labs) {
    var best = 0, bestD = Infinity;
    for (var i = 0; i < labs.length; i++) {
      var L = labs[i];
      var dl = lab[0] - L[0], da = lab[1] - L[1], db = lab[2] - L[2];
      var d = dl * dl + da * da + db * db;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  /**
   * @param {Uint8ClampedArray|Array} pixels RGBA, length w*h*4 (cell averages)
   * @param {number} w
   * @param {number} h
   * @param {Array<{code:string,name:string,hex:string}>} colors
   * @param {{dither?:boolean, alphaCut?:number}} [opts]
   * @returns {{w:number,h:number,cells:Int16Array,counts:number[],total:number}}
   */
  function quantizeCells(pixels, w, h, colors, opts) {
    opts = opts || {};
    var n = w * h;
    var cells = new Int16Array(n);
    var counts = new Array(colors.length);
    for (var c = 0; c < colors.length; c++) counts[c] = 0;

    var labs = new Array(colors.length);
    var rgbs = new Array(colors.length);
    for (var k = 0; k < colors.length; k++) {
      var rgb = hexToRgb(colors[k].hex);
      rgbs[k] = rgb;
      labs[k] = rgbToLab(rgb[0], rgb[1], rgb[2]);
    }

    var alphaCut = opts.alphaCut == null ? 128 : opts.alphaCut;
    var dither = !!opts.dither;

    var fr = null, fg = null, fb = null;
    if (dither) {
      fr = new Float32Array(n);
      fg = new Float32Array(n);
      fb = new Float32Array(n);
      for (var i0 = 0; i0 < n; i0++) {
        fr[i0] = pixels[i0 * 4];
        fg[i0] = pixels[i0 * 4 + 1];
        fb[i0] = pixels[i0 * 4 + 2];
      }
    }

    var total = 0;

    function addErr(x, y, er, eg, eb, factor) {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      var j = y * w + x;
      fr[j] += er * factor;
      fg[j] += eg * factor;
      fb[j] += eb * factor;
    }

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = y * w + x;
        if (pixels[i * 4 + 3] < alphaCut) {
          cells[i] = -1;
          continue;
        }
        var r, g, b;
        if (dither) {
          r = clamp255(fr[i]);
          g = clamp255(fg[i]);
          b = clamp255(fb[i]);
        } else {
          r = pixels[i * 4];
          g = pixels[i * 4 + 1];
          b = pixels[i * 4 + 2];
        }
        var idx = nearestLab(rgbToLab(r, g, b), labs);
        cells[i] = idx;
        counts[idx]++;
        total++;

        if (dither) {
          var pr = rgbs[idx][0], pg = rgbs[idx][1], pb = rgbs[idx][2];
          var er = r - pr, eg = g - pg, eb = b - pb;
          if (x % 2 === 0) {
            addErr(x + 1, y, er, eg, eb, 7 / 16);
            addErr(x - 1, y + 1, er, eg, eb, 3 / 16);
            addErr(x, y + 1, er, eg, eb, 5 / 16);
            addErr(x + 1, y + 1, er, eg, eb, 1 / 16);
          } else {
            addErr(x - 1, y, er, eg, eb, 7 / 16);
            addErr(x + 1, y + 1, er, eg, eb, 3 / 16);
            addErr(x, y + 1, er, eg, eb, 5 / 16);
            addErr(x - 1, y + 1, er, eg, eb, 1 / 16);
          }
        }
      }
    }

    return { w: w, h: h, cells: cells, counts: counts, total: total, palette: { colors: colors } };
  }

  /** Palette rows that actually appear, sorted by bead count. */
  function usedColors(pattern) {
    var out = [];
    var colors = pattern.palette.colors;
    for (var i = 0; i < colors.length; i++) {
      if (pattern.counts[i] > 0) {
        out.push({
          index: i,
          code: colors[i].code,
          name: colors[i].name,
          hex: colors[i].hex,
          count: pattern.counts[i]
        });
      }
    }
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  }

  function patternFromCodes(rows, palette) {
    var h = rows.length;
    var w = rows[0].length;
    var cells = new Int16Array(w * h);
    var counts = new Array(palette.colors.length).fill(0);
    var total = 0;
    for (var y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error("Row " + y + " is " + rows[y].length + " wide, expected " + w);
      for (var x = 0; x < w; x++) {
        var ch = rows[y][x];
        if (ch === "." || ch === " ") {
          cells[y * w + x] = -1;
          continue;
        }
        var found = -1;
        for (var c = 0; c < palette.colors.length; c++) {
          if (palette.colors[c].code === ch) { found = c; break; }
        }
        if (found < 0) throw new Error("Unknown bead code " + ch + " in row " + y);
        cells[y * w + x] = found;
        counts[found]++;
        total++;
      }
    }
    return { w: w, h: h, cells: cells, counts: counts, total: total, palette: palette };
  }

  /**
   * Force a pattern onto a smaller set of beads: drop colours the maker does
   * not own, then merge the least-used colours until at most `maxColors`
   * remain. Merging happens in Lab space, so the nearest surviving bead wins.
   *
   * @param {object} pattern
   * @param {{allowed?: boolean[]|null, maxColors?: number}} [opts]
   * @returns {object} new pattern (input untouched) with a `merges` report
   */
  function reduce(pattern, opts) {
    opts = opts || {};
    var colors = pattern.palette.colors;
    var n = pattern.cells.length;
    var cells = new Int16Array(pattern.cells);
    var counts = pattern.counts.slice();
    var labs = new Array(colors.length);
    for (var i = 0; i < colors.length; i++) {
      var rgb = hexToRgb(colors[i].hex);
      labs[i] = rgbToLab(rgb[0], rgb[1], rgb[2]);
    }

    var allowed = opts.allowed || null;
    var active = new Array(colors.length).fill(false);
    var candidates = 0;
    for (i = 0; i < colors.length; i++) {
      if (!allowed || allowed[i]) {
        active[i] = true;
        candidates++;
      }
    }

    var unchanged = {
      w: pattern.w, h: pattern.h, cells: cells, counts: counts,
      total: pattern.total, palette: pattern.palette, merges: []
    };
    // the maker owns nothing we can draw with: keep the chart intact
    if (candidates === 0) return unchanged;

    var merges = [];

    function usedCount() {
      var c = 0;
      for (var k = 0; k < colors.length; k++) if (counts[k] > 0) c++;
      return c;
    }

    function nearest(from) {
      var best = -1, bestD = Infinity;
      for (var k = 0; k < colors.length; k++) {
        if (!active[k] || k === from) continue;
        var a = labs[from], b = labs[k];
        var d = (a[0] - b[0]) * (a[0] - b[0]) +
          (a[1] - b[1]) * (a[1] - b[1]) +
          (a[2] - b[2]) * (a[2] - b[2]);
        if (d < bestD) { bestD = d; best = k; }
      }
      return best;
    }

    function remap(from, to) {
      var moved = counts[from];
      if (moved <= 0) return;
      for (var k = 0; k < n; k++) if (cells[k] === from) cells[k] = to;
      counts[to] += moved;
      counts[from] = 0;
      merges.push({ from: from, to: to, count: moved });
    }

    // 1. every colour in use must be one the maker owns
    for (i = 0; i < colors.length; i++) {
      if (counts[i] > 0 && !active[i]) {
        var t = nearest(i);
        if (t >= 0) remap(i, t);
      }
    }

    // 2. collapse the least-used colours until the cap is respected
    var max = opts.maxColors || 0;
    while (max > 0 && usedCount() > max) {
      var src = -1, min = Infinity;
      for (i = 0; i < colors.length; i++) {
        if (active[i] && counts[i] > 0 && counts[i] < min) {
          min = counts[i];
          src = i;
        }
      }
      if (src < 0) break;
      var target = nearest(src);
      if (target < 0) break;
      remap(src, target);
      active[src] = false;
    }

    return {
      w: pattern.w, h: pattern.h, cells: cells, counts: counts,
      total: pattern.total, palette: pattern.palette, merges: merges
    };
  }

  return {
    hexToRgb: hexToRgb,
    rgbToLab: rgbToLab,
    quantizeCells: quantizeCells,
    usedColors: usedColors,
    patternFromCodes: patternFromCodes,
    reduce: reduce
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BPMQuant;
