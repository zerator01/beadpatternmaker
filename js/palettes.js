/* Bead palettes for Bead Pattern Maker.
   Codes are one character so they fit inside a printed grid cell.
   Hex values are screen approximations of physical beads — always check a real
   bead against the swatch before committing to a large piece. */
var BPMPalettes = (function () {
  "use strict";

  function build(list) {
    return list.map(function (c) {
      return { code: c[0], name: c[1], hex: c[2] };
    });
  }

  var PERLER = build([
    ["W", "White", "#F6F3EA"],
    ["C", "Cream", "#F0E2C2"],
    ["K", "Black", "#202020"],
    ["S", "Grey", "#9A9A96"],
    ["D", "Charcoal", "#4A4A48"],
    ["R", "Red", "#D92B2B"],
    ["M", "Pink", "#E86293"],
    ["L", "Light pink", "#F5B1C9"],
    ["O", "Orange", "#F08A26"],
    ["Y", "Yellow", "#F5CE42"],
    ["G", "Green", "#2FA45A"],
    ["V", "Light green", "#8BD96B"],
    ["T", "Teal", "#119D90"],
    ["B", "Blue", "#2E6FDC"],
    ["A", "Light blue", "#8CCFEB"],
    ["N", "Navy", "#1E3B70"],
    ["P", "Purple", "#7A46D4"],
    ["U", "Lavender", "#B9A4EC"],
    ["E", "Brown", "#7D5330"],
    ["Q", "Tan", "#CFA373"],
    ["F", "Fuchsia", "#D42088"],
    ["H", "Peach", "#FFA17E"],
    ["X", "Gold", "#D7AB3C"],
    ["Z", "Neon yellow", "#EAF75B"],
    ["I", "Mint", "#A9E5D1"],
    ["J", "Sky", "#C3E7F6"]
  ]);

  var HAMA = build([
    ["W", "White", "#F7F4EE"],
    ["C", "Cream", "#EFE1C5"],
    ["K", "Black", "#232323"],
    ["S", "Grey", "#9C9D9A"],
    ["D", "Dark grey", "#50504D"],
    ["R", "Red", "#D73634"],
    ["M", "Pink", "#E66A96"],
    ["L", "Light pink", "#F7B8CD"],
    ["O", "Orange", "#F18B2B"],
    ["Y", "Yellow", "#F4C93F"],
    ["G", "Green", "#2C9852"],
    ["V", "Light green", "#8CD46D"],
    ["T", "Teal", "#13988B"],
    ["B", "Blue", "#2A68CF"],
    ["A", "Light blue", "#87C9E5"],
    ["N", "Navy", "#213D70"],
    ["P", "Purple", "#7B4CCB"],
    ["U", "Lavender", "#B9A6E8"],
    ["E", "Brown", "#805534"],
    ["Q", "Tan", "#D2A876"],
    ["F", "Fuchsia", "#D62A8B"],
    ["H", "Peach", "#FFA383"],
    ["X", "Gold", "#D6AB42"],
    ["Z", "Neon yellow", "#E8F45A"],
    ["I", "Mint", "#ADE7D3"],
    ["J", "Sky", "#C5E8F4"]
  ]);

  var ARTKAL = build([
    ["W", "White", "#F5F2EA"],
    ["C", "Cream", "#F1E4C9"],
    ["K", "Black", "#1E1E1E"],
    ["S", "Grey", "#979794"],
    ["D", "Charcoal", "#484846"],
    ["R", "Red", "#DC3034"],
    ["M", "Pink", "#E75E91"],
    ["L", "Light pink", "#F6B5CB"],
    ["O", "Orange", "#F18729"],
    ["Y", "Yellow", "#F6D046"],
    ["G", "Green", "#31A35C"],
    ["V", "Light green", "#8DDD70"],
    ["T", "Teal", "#109E93"],
    ["B", "Blue", "#2B6FDB"],
    ["A", "Light blue", "#8FD1ED"],
    ["N", "Navy", "#1E3C73"],
    ["P", "Purple", "#7D47D7"],
    ["U", "Lavender", "#BBA6EF"],
    ["E", "Brown", "#7D522F"],
    ["Q", "Tan", "#D0A273"],
    ["F", "Fuchsia", "#D52387"],
    ["H", "Peach", "#FFA17B"],
    ["X", "Gold", "#D8AD40"],
    ["Z", "Neon yellow", "#EBF65E"],
    ["I", "Mint", "#A7E4D0"],
    ["J", "Sky", "#C1E6F5"]
  ]);

  var PALETTES = {
    perler: {
      id: "perler",
      label: "Perler (26)",
      short: "Perler",
      colors: PERLER
    },
    hama: {
      id: "hama",
      label: "Hama (26)",
      short: "Hama",
      colors: HAMA
    },
    artkal: {
      id: "artkal",
      label: "Artkal (26)",
      short: "Artkal",
      colors: ARTKAL
    }
  };

  function get(key) {
    return PALETTES[key] || PALETTES.perler;
  }

  function byCode(palette, code) {
    for (var i = 0; i < palette.colors.length; i++) {
      if (palette.colors[i].code === code) return palette.colors[i];
    }
    return null;
  }

  return { PALETTES: PALETTES, get: get, byCode: byCode };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BPMPalettes;
