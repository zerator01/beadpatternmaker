/* Compact, URL-safe encoding for a bead pattern.
   Layout: <palette>.<w>.<h>.<base64url of RLE [value+1, varint run]> */
var BPMShare = (function () {
  "use strict";

  var A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  function toB64(bytes) {
    var out = "";
    var i = 0;
    for (; i + 2 < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += A[(n >> 18) & 63] + A[(n >> 12) & 63] + A[(n >> 6) & 63] + A[n & 63];
    }
    var rem = bytes.length - i;
    if (rem === 1) {
      var a = bytes[i] << 16;
      out += A[(a >> 18) & 63] + A[(a >> 12) & 63];
    } else if (rem === 2) {
      var b = (bytes[i] << 16) | (bytes[i + 1] << 8);
      out += A[(b >> 18) & 63] + A[(b >> 12) & 63] + A[(b >> 6) & 63];
    }
    return out;
  }

  function fromB64(str) {
    var bytes = [];
    var acc = 0, bits = 0;
    for (var i = 0; i < str.length; i++) {
      var v = A.indexOf(str[i]);
      if (v < 0) return null;
      acc = (acc << 6) | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((acc >> bits) & 255);
      }
    }
    return bytes;
  }

  function encode(pattern, paletteKey) {
    var cells = pattern.cells;
    var bytes = [];
    var i = 0;
    while (i < cells.length) {
      var v = cells[i];
      var run = 1;
      while (i + run < cells.length && cells[i + run] === v) run++;
      bytes.push(v + 1);
      var n = run;
      do {
        var b = n & 127;
        n >>= 7;
        if (n) b |= 128;
        bytes.push(b);
      } while (n);
      i += run;
    }
    return paletteKey + "." + pattern.w + "." + pattern.h + "." + toB64(bytes);
  }

  function decode(str) {
    if (!str) return null;
    var parts = String(str).split(".");
    if (parts.length !== 4) return null;
    var key = parts[0];
    var w = parseInt(parts[1], 10);
    var h = parseInt(parts[2], 10);
    if (!(w > 0 && h > 0 && w <= 200 && h <= 200)) return null;

    var bytes = fromB64(parts[3]);
    if (!bytes) return null;

    var cells = new Int16Array(w * h);
    var p = 0, i = 0;
    while (i < cells.length) {
      if (p >= bytes.length) return null;
      var v = bytes[p++] - 1;
      var run = 0, shift = 0, b;
      do {
        if (p >= bytes.length) return null;
        b = bytes[p++];
        run |= (b & 127) << shift;
        shift += 7;
        if (shift > 21) return null;
      } while (b & 128);
      if (run <= 0 || i + run > cells.length) return null;
      for (var k = 0; k < run; k++) cells[i++] = v;
    }

    return { paletteKey: key, w: w, h: h, cells: cells };
  }

  /** Rebuild a full pattern object (with counts) from decoded data. */
  function toPattern(decoded, palette) {
    var counts = new Array(palette.colors.length).fill(0);
    var total = 0;
    for (var i = 0; i < decoded.cells.length; i++) {
      var v = decoded.cells[i];
      if (v >= 0 && v < palette.colors.length) {
        counts[v]++;
        total++;
      } else {
        decoded.cells[i] = -1;
      }
    }
    return {
      w: decoded.w, h: decoded.h, cells: decoded.cells,
      counts: counts, total: total, palette: palette
    };
  }

  return { encode: encode, decode: decode, toPattern: toPattern };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BPMShare;
