/* Framing maths: turn {zoom, cx, cy} into a source rectangle with the same
   aspect ratio as the bead grid. Pure functions so they can be tested. */
var BPMFrame = (function () {
  "use strict";

  function clamp(v, lo, hi) {
    if (hi < lo) return (lo + hi) / 2;
    return v < lo ? lo : v > hi ? hi : v;
  }

  /** Largest crop of the wanted aspect that fits inside the image, normalised. */
  function baseSize(imgW, imgH, aspect) {
    var imgAspect = imgW / imgH;
    var ratio = aspect / imgAspect; // crop width / crop height in normalised units
    if (ratio >= 1) return { w: 1, h: 1 / ratio };
    return { w: ratio, h: 1 };
  }

  /**
   * @param {number} imgW
   * @param {number} imgH
   * @param {number} aspect  grid cols / rows
   * @param {{zoom?:number, cx?:number, cy?:number}} crop
   * @returns {{x:number,y:number,w:number,h:number,nx:number,ny:number,nw:number,nh:number}}
   */
  function rect(imgW, imgH, aspect, crop) {
    crop = crop || {};
    var base = baseSize(imgW, imgH, aspect);
    var zoom = Math.max(1, Math.min(8, crop.zoom || 1));
    var nw = Math.min(1, base.w / zoom);
    var nh = Math.min(1, base.h / zoom);

    var cx = crop.cx == null ? 0.5 : crop.cx;
    var cy = crop.cy == null ? 0.5 : crop.cy;
    cx = clamp(cx, nw / 2, 1 - nw / 2);
    cy = clamp(cy, nh / 2, 1 - nh / 2);

    var nx = cx - nw / 2;
    var ny = cy - nh / 2;

    return {
      x: nx * imgW,
      y: ny * imgH,
      w: nw * imgW,
      h: nh * imgH,
      nx: nx,
      ny: ny,
      nw: nw,
      nh: nh
    };
  }

  return { baseSize: baseSize, rect: rect, clamp: clamp };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BPMFrame;
