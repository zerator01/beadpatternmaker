/* Canvas renderer for bead patterns. */
var BPMRender = (function () {
  "use strict";

  function luminance(hex) {
    var h = hex.replace("#", "");
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  var DEFAULTS = {
    cell: 18,
    pad: 0,
    dpr: 1,
    mode: "grid",      // "grid" | "bead"
    codes: false,
    gridLines: true,
    background: null,
    holeColor: "#f7fafb",
    every5: true,
    highlight: null
  };

  function renderPattern(canvas, pattern, options) {
    var opts = {};
    for (var k in DEFAULTS) opts[k] = DEFAULTS[k];
    for (var k2 in options) opts[k2] = options[k2];

    var cell = opts.cell;
    var pad = opts.pad;
    var w = pattern.w, h = pattern.h;
    var cssW = Math.round(w * cell + pad * 2);
    var cssH = Math.round(h * cell + pad * 2);
    var dpr = opts.dpr || 1;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (opts.background) {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, cssW, cssH);
    }

    var colors = pattern.palette.colors;
    var cells = pattern.cells;
    var x, y, i, idx, hex;

    if (opts.mode === "bead") {
      var r = cell / 2 - Math.max(0.6, cell * 0.055);
      var hr = Math.max(1.1, cell * 0.16);
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          i = y * w + x;
          idx = cells[i];
          if (idx < 0) continue;
          hex = colors[idx].hex;
          var cx = pad + x * cell + cell / 2;
          var cy = pad + y * cell + cell / 2;

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = hex;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(27, 23, 20, 0.28)";
          ctx.lineWidth = Math.max(0.5, cell * 0.028);
          ctx.stroke();

          if (hr > 1.2) {
            ctx.beginPath();
            ctx.arc(cx, cy, hr, 0, Math.PI * 2);
            ctx.fillStyle = opts.holeColor;
            ctx.fill();
            ctx.strokeStyle = "rgba(27, 23, 20, 0.22)";
            ctx.lineWidth = Math.max(0.4, cell * 0.02);
            ctx.stroke();
          }
        }
      }
      return { width: cssW, height: cssH };
    }

    // grid mode
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        idx = cells[i];
        if (idx < 0) continue;
        ctx.fillStyle = colors[idx].hex;
        ctx.fillRect(pad + x * cell, pad + y * cell, cell + 0.35, cell + 0.35);
      }
    }

    if (opts.gridLines) {
      var thin = Math.max(0.5, cell * 0.035);

      // minor lines (skip the 5-step ones, they get their own weight)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(27, 23, 20, 0.14)";
      ctx.lineWidth = thin;
      for (var gx = 0; gx <= w; gx++) {
        if (gx % 5 === 0) continue;
        var px = pad + gx * cell;
        ctx.moveTo(px, pad);
        ctx.lineTo(px, pad + h * cell);
      }
      for (var gy = 0; gy <= h; gy++) {
        if (gy % 5 === 0) continue;
        var py = pad + gy * cell;
        ctx.moveTo(pad, py);
        ctx.lineTo(pad + w * cell, py);
      }
      ctx.stroke();

      if (opts.every5) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(27, 23, 20, 0.42)";
        ctx.lineWidth = Math.max(0.8, thin * 1.6);
        for (var mx = 5; mx < w; mx += 5) {
          ctx.moveTo(pad + mx * cell, pad);
          ctx.lineTo(pad + mx * cell, pad + h * cell);
        }
        for (var my = 5; my < h; my += 5) {
          ctx.moveTo(pad, pad + my * cell);
          ctx.lineTo(pad + w * cell, pad + my * cell);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(27, 23, 20, 0.6)";
      ctx.lineWidth = Math.max(1, thin * 1.8);
      ctx.strokeRect(pad + 0.5, pad + 0.5, w * cell - 1, h * cell - 1);
    }

    if (opts.codes && cell >= 13) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 " + Math.max(8, Math.round(cell * 0.44)) + "px " +
        'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          i = y * w + x;
          idx = cells[i];
          if (idx < 0) continue;
          hex = colors[idx].hex;
          ctx.fillStyle = luminance(hex) > 0.62 ? "rgba(20,18,17,0.85)" : "rgba(255,255,255,0.92)";
          ctx.fillText(
            colors[idx].code,
            pad + x * cell + cell / 2,
            pad + y * cell + cell / 2 + cell * 0.02
          );
        }
      }
    }

    if (opts.highlight) {
      var hx = pad + opts.highlight.x * cell;
      var hy = pad + opts.highlight.y * cell;
      ctx.lineWidth = Math.max(2, cell * 0.14);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.strokeRect(hx + 0.5, hy + 0.5, cell - 1, cell - 1);
      ctx.lineWidth = Math.max(1, cell * 0.07);
      ctx.strokeStyle = "#1b1714";
      ctx.strokeRect(hx + 0.5, hy + 0.5, cell - 1, cell - 1);
    }

    return { width: cssW, height: cssH };
  }

  function toCanvas(pattern, options) {
    var c = document.createElement("canvas");
    renderPattern(c, pattern, options);
    return c;
  }

  function toDataURL(pattern, options) {
    return toCanvas(pattern, options).toDataURL("image/png");
  }

  return {
    renderPattern: renderPattern,
    toCanvas: toCanvas,
    toDataURL: toDataURL,
    luminance: luminance
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BPMRender;
