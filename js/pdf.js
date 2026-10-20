/* Minimal PDF writer — no dependencies.
   Produces a tiled, print-ready pattern grid plus a bead shopping list. */
var BPMPDF = (function () {
  "use strict";

  var PW = 595.28;   // A4 portrait, points
  var PH = 841.89;
  var M = 36;
  var HEADER = 54;

  function esc(s) {
    return String(s).replace(/[\\()]/g, function (m) { return "\\" + m; });
  }

  function f(n) {
    if (!isFinite(n)) n = 0;
    var s = n.toFixed(2);
    if (s === "-0.00") s = "0.00";
    return s;
  }

  function rgbOf(hex) {
    var h = hex.replace("#", "");
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function text(str, x, y, size, font, color) {
    return (color || "0.07 0.06 0.05") + " rg\nBT /" + (font || "F1") + " " +
      f(size) + " Tf " + f(x) + " " + f(y) +
      " Td (" + esc(str) + ") Tj ET\n";
  }

  function rect(x, y, w, h) {
    return f(x) + " " + f(y) + " " + f(w) + " " + f(h) + " re\n";
  }

  function strokeRect(x, y, w, h) {
    return f(x) + " " + f(y) + " " + f(w) + " " + f(h) + " re S\n";
  }

  function safeTitle(s) {
    return String(s || "Bead pattern")
      .replace(/[^\x20-\x7E]/g, "")
      .slice(0, 70) || "Bead pattern";
  }

  /**
   * @param {{w:number,h:number,cells:Int16Array,counts:number[],total:number,palette:object}} pattern
   * @param {{title?:string, site?:string, showCodes?:boolean}} [opts]
   * @returns {Uint8Array}
   */
  function build(pattern, opts) {
    opts = opts || {};
    var title = safeTitle(opts.title);
    var site = opts.site || "beadpatternmaker.io";
    var colors = pattern.palette.colors;
    var w = pattern.w, h = pattern.h;
    var cells = pattern.cells;
    var showCodes = opts.showCodes !== false;
    var blank = !!opts.blank;

    var pages = [];

    // --- geometry -----------------------------------------------------
    var availW = PW - 2 * M;
    var gridAreaH = PH - 2 * M - HEADER - 16;
    var actualSize = opts.cellPt > 0;
    var onePageCell = actualSize ? opts.cellPt : Math.min(availW / w, gridAreaH / h, 46);
    // Big square-ish charts print better tiled; wide-and-short phrase charts
    // should never be split across sheets.
    var tile = actualSize || (w > 48 && h > 48) || onePageCell < 6;
    var cell, colsPerPage, rowsPerPage;

    if (!tile) {
      cell = onePageCell;
      colsPerPage = w;
      rowsPerPage = h;
    } else {
      cell = actualSize ? opts.cellPt : 12;
      colsPerPage = Math.max(1, Math.floor(availW / cell));
      rowsPerPage = Math.max(1, Math.floor(gridAreaH / cell));
    }

    var tilesX = Math.ceil(w / colsPerPage);
    var tilesY = Math.ceil(h / rowsPerPage);
    var tileCount = tilesX * tilesY;

    // --- pattern pages -------------------------------------------------
    for (var ty = 0; ty < tilesY; ty++) {
      for (var tx = 0; tx < tilesX; tx++) {
        var c0 = tx * colsPerPage;
        var r0 = ty * rowsPerPage;
        var cols = Math.min(colsPerPage, w - c0);
        var rows = Math.min(rowsPerPage, h - r0);
        var gw = cols * cell;
        var gh = rows * cell;
        var x0 = M + (availW - gw) / 2;
        var yTop = PH - M - HEADER;
        var page = [];
        var pageNo = ty * tilesX + tx + 1;

        page.push(text(title, M, PH - M - 6, 15, "F2"));
        page.push(text(
          (blank ? "Blank pegboard template" : "Bead chart") +
          (tileCount > 1 ? " - sheet " + pageNo + " of " + tileCount : "") +
          "  |  " + w + " x " + h + " beads  |  " + (blank ? "ready to fill in" : pattern.total + " beads total"),
          M, PH - M - 24, 9, "F1"
        ));
        page.push(text(
          "Columns " + (c0 + 1) + "-" + (c0 + cols) + ", rows " + (r0 + 1) + "-" + (r0 + rows) +
          ". Grid lines every 5 beads." +
          (actualSize ? "  Printed at actual size: 1 cell = " + (cell / 72 * 25.4).toFixed(1) + " mm." : ""),
          M, PH - M - 38, 8.5, "F1"
        ));

        // fills, grouped by palette index (one fill call per colour)
        for (var ci = 0; ci < colors.length; ci++) {
          var any = false;
          var body = "";
          for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
              var idx = cells[(r0 + r) * w + (c0 + c)];
              if (idx !== ci) continue;
              body += rect(
                x0 + c * cell,
                yTop - (r + 1) * cell,
                cell,
                cell
              );
              any = true;
            }
          }
          if (any) {
            var rgb = rgbOf(colors[ci].hex);
            page.push(f(rgb[0]) + " " + f(rgb[1]) + " " + f(rgb[2]) + " rg\n" + body + "f\n");
          }
        }

        // grid
        var g = "";
        g += "0.72 0.70 0.66 RG\n0.4 w\n";
        for (var gx = 0; gx <= cols; gx++) {
          g += f(x0 + gx * cell) + " " + f(yTop - gh) + " m " +
            f(x0 + gx * cell) + " " + f(yTop) + " l\n";
        }
        for (var gy = 0; gy <= rows; gy++) {
          g += f(x0) + " " + f(yTop - gy * cell) + " m " +
            f(x0 + gw) + " " + f(yTop - gy * cell) + " l\n";
        }
        g += "S\n";

        // every-5 emphasis
        g += "0.28 0.26 0.24 RG\n0.9 w\n";
        for (var mx = 5; mx < cols; mx += 5) {
          g += f(x0 + mx * cell) + " " + f(yTop - gh) + " m " +
            f(x0 + mx * cell) + " " + f(yTop) + " l\n";
        }
        for (var my = 5; my < rows; my += 5) {
          g += f(x0) + " " + f(yTop - my * cell) + " m " +
            f(x0 + gw) + " " + f(yTop - my * cell) + " l\n";
        }
        g += "S\n";

        // outer border
        g += "0.11 0.09 0.08 RG\n1.2 w\n" +
          strokeRect(x0, yTop - gh, gw, gh);
        page.push(g);

        // codes
        if (showCodes && !blank && cell >= 10.5) {
          var fs = Math.min(14, Math.max(5, cell * 0.42));
          var codes = "";
          for (var r2 = 0; r2 < rows; r2++) {
            for (var c2 = 0; c2 < cols; c2++) {
              var di = cells[(r0 + r2) * w + (c0 + c2)];
              if (di < 0) continue;
              var lum = BPMRender.luminance(colors[di].hex);
              var tw = colors[di].code.length * fs * 0.55;
              codes += text(
                colors[di].code,
                x0 + c2 * cell + (cell - tw) / 2,
                yTop - (r2 + 1) * cell + cell / 2 - fs * 0.35,
                fs,
                "F2",
                lum > 0.62 ? "0.08 0.07 0.06" : "1 1 1"
              );
            }
          }
          page.push(codes);
        }

        page.push(text(
          site + "  -  " + pageNo + "/" + (blank ? tileCount : tileCount + 1),
          M, M - 12, 8, "F1"
        ));

        pages.push(page.join(""));
      }
    }

    if (blank) return assemble(pages, title);

    // --- bead list page -------------------------------------------------
    var used = BPMQuant.usedColors(pattern);
    var list = [];
    list.push(text(title, M, PH - M - 6, 15, "F2"));
    list.push(text("Bead list - one row per colour", M, PH - M - 24, 9, "F1"));

    var colW = (availW - 12) / 2;
    var rowH = 17;
    var perCol = Math.floor((PH - 2 * M - HEADER - 40) / rowH);

    for (var i = 0; i < used.length; i++) {
      var u = used[i];
      var col = Math.floor(i / perCol);
      var row = i % perCol;
      var bx = M + col * (colW + 12);
      var by = PH - M - HEADER - 10 - (row + 1) * rowH;

      var c = rgbOf(u.hex);
      list.push("q\n" + f(c[0]) + " " + f(c[1]) + " " + f(c[2]) + " rg\n" +
        rect(bx, by + 3, 10, 10) + "f\n" +
        "0.15 0.13 0.12 RG\n0.6 w\n" + strokeRect(bx, by + 3, 10, 10) + "Q\n");

      list.push(text(u.code, bx + 16, by + 4.5, 8.5, "F2"));
      list.push(text(u.name + "  " + u.hex, bx + 29, by + 4.5, 8, "F1"));
      list.push(text(String(u.count), bx + colW - 8 - String(u.count).length * 4.4, by + 4.5, 8.5, "F2"));
    }

    var rowsUsed = used.length === 0 ? 0 : (used.length - 1) % perCol + 1;
    var listBottom = PH - M - HEADER - 10 - rowsUsed * rowH;
    if (used.length === 0) {
      list.push(text("No beads - the source image was fully transparent.", M, PH / 2, 11, "F1"));
      listBottom = PH / 2 - 20;
    }
    list.push(text(
      "Total beads: " + pattern.total + "   |   Colours used: " + used.length,
      M, Math.max(M + 24, listBottom - 10), 10, "F2"
    ));
    list.push(text(
      "Print at 100% (no scaling). Codes are the bead colour; every 5th line is heavier so you can count rows.",
      M, Math.max(M + 10, listBottom - 24), 7.5, "F1"
    ));
    list.push(text(site + "  -  " + (tileCount + 1) + "/" + (tileCount + 1), M, M - 12, 8, "F1"));
    pages.push(list.join(""));

    return assemble(pages, title);
  }

  function assemble(pages, title) {
    var objs = [];
    function add(s) { objs.push(s); return objs.length; }

    var catalogId = add("<< /Type /Catalog /Pages 2 0 R >>");
    var pagesId = add(""); // filled in later, must stay object 2
    var f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    var f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    var kids = [];
    for (var i = 0; i < pages.length; i++) {
      var content = pages[i];
      var contentId = add("<< /Length " + content.length + " >>\nstream\n" + content + "endstream");
      var pageId = add(
        "<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " + f(PW) + " " + f(PH) + "]" +
        " /Resources << /Font << /F1 " + f1 + " 0 R /F2 " + f2 + " 0 R >> >>" +
        " /Contents " + contentId + " 0 R >>"
      );
      kids.push(pageId);
    }

    objs[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
    objs[pagesId - 1] = "<< /Type /Pages /Kids [" +
      kids.map(function (k) { return k + " 0 R"; }).join(" ") + "] /Count " + kids.length + " >>";

    var out = [];
    var pos = 0;
    function push(s) { out.push(s); pos += s.length; }

    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    var offsets = [0];
    for (var j = 0; j < objs.length; j++) {
      offsets.push(pos);
      push((j + 1) + " 0 obj\n" + objs[j] + "\nendobj\n");
    }

    var xrefPos = pos;
    var count = objs.length + 1;
    var xref = "xref\n0 " + count + "\n0000000000 65535 f \n";
    for (var k = 1; k < count; k++) {
      var off = String(offsets[k]);
      while (off.length < 10) off = "0" + off;
      xref += off + " 00000 n \n";
    }
    push(xref);
    push("trailer\n<< /Size " + count + " /Root 1 0 R /Info << /Title (" + esc(title) + ") /Producer (beadpatternmaker.io) >> >>\nstartxref\n" + xrefPos + "\n%%EOF\n");

    // ASCII-safe: the binary comment above uses latin-1 chars, so use char codes.
    var bytes = new Uint8Array(pos);
    var p = 0;
    for (var m = 0; m < out.length; m++) {
      var s = out[m];
      for (var n = 0; n < s.length; n++) bytes[p++] = s.charCodeAt(n) & 0xff;
    }
    return bytes;
  }

  return { build: build, PW: PW, PH: PH };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BPMPDF;
