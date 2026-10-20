/* Page registry and launch waves.
   Pages ship in waves: only pages with wave <= LIVE_WAVE are linked from other
   pages, listed in the sitemap and copied into dist. The rest are still built
   so they can be previewed locally. To ship the next wave, raise LIVE_WAVE and
   run the build again. */
"use strict";

const LIVE_WAVE = 1;

// keyword: the query the page targets; it is also the anchor text other pages
// use when they link here. home: the sentence this page uses to link back to
// the homepage. The {braced} words are the anchor, a different variant of the
// homepage keyword on every page.
const PAGES = [
  {
    key: "home",
    path: "/",
    wave: 1,
    keyword: "perler bead pattern maker"
  },
  {
    key: "designs",
    path: "/perler-bead-designs/",
    wave: 1,
    keyword: "perler bead designs",
    blurb: "Original charts sorted by theme, each with a bead count and a PDF.",
    home: "Have a photo instead? Turn it into a coded chart with the {perler bead pattern maker}."
  },
  {
    key: "ideas",
    path: "/fuse-bead-ideas/",
    wave: 1,
    keyword: "fuse bead ideas",
    blurb: "What to make with a design: keychains, gifts, party decorations and more.",
    home: "Want an idea nobody else has made? Upload a photo to the {free perler bead pattern maker} and build it from scratch."
  },
  {
    key: "patterns",
    path: "/fuse-bead-patterns/",
    wave: 2,
    keyword: "fuse bead patterns",
    blurb: "Printable PDF charts with a colour code in every cell.",
    home: "Cannot find the one you want? {Make your own perler bead pattern} from a photo, with the same chart and bead list."
  },
  {
    key: "templates",
    path: "/perler-bead-templates/",
    wave: 2,
    keyword: "perler bead templates",
    blurb: "Blank printable grids from 10 × 10 up to 64 × 64.",
    home: "Rather not draw it by hand? The {perler bead pattern maker tool} fills the grid from a photo and counts every colour."
  },
  {
    key: "maker",
    path: "/perler-bead-maker/",
    wave: 2,
    keyword: "perler bead maker",
    home: "The homepage runs the same editor as a full {perler pattern maker}, with the design library and sizing guide alongside it."
  },
  {
    key: "generator",
    path: "/perler-bead-generator/",
    wave: 2,
    keyword: "perler bead generator",
    home: "Working on something smaller? The {perler bead pattern generator} on the homepage starts from a 32-bead grid."
  },
  {
    key: "fuseMaker",
    path: "/fuse-bead-pattern-maker/",
    wave: 2,
    keyword: "fuse bead pattern maker",
    home: "Working with Perler beads? The {perler pattern creator} on the homepage starts on the Perler palette."
  },
  {
    key: "iron",
    path: "/how-to-iron-perler-beads/",
    wave: 3,
    keyword: "how to iron perler beads",
    blurb: "Heat, timing and fixes for a flat, evenly fused piece.",
    home: "Need a chart before you iron? Make one with the {online perler bead pattern maker}. It is free, and your photo never leaves the browser."
  }
];

const BY_KEY = {};
const BY_PATH = {};
PAGES.forEach(function (p) {
  BY_KEY[p.key] = p;
  BY_PATH[p.path] = p;
});

function page(key) {
  const p = BY_KEY[key];
  if (!p) throw new Error("unknown page " + key);
  return p;
}

// Accepts a page path, optionally with a #fragment or ?query. Paths that are
// not pages (assets, the 404) are always live.
function isLive(href) {
  const p = BY_PATH[href.split("#")[0].split("?")[0]];
  return !p || p.wave <= LIVE_WAVE;
}

function livePages() {
  return PAGES.filter(function (p) { return p.wave <= LIVE_WAVE; });
}

module.exports = { LIVE_WAVE: LIVE_WAVE, PAGES: PAGES, page: page, isLive: isLive, livePages: livePages };
