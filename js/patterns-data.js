/* Hand-built perler bead designs used by the galleries and the "open in maker"
   links. Rows are read top to bottom; each character is a bead palette code and
   "." is an empty peg. Codes are shared by all three palettes so a design can be
   recoloured by simply switching the palette. */
var BPMPatterns = (function () {
  "use strict";

  var LIST = [
    {
      slug: "berry-heart",
      name: "Berry Heart",
      theme: "cute",
      difficulty: "easy",
      description: "A chunky heart that reads at a glance — the classic first pegboard project.",
      idea: "Glue a magnet to the back for the fridge, or thread a jump ring through the top corner for a keychain.",
      rows: [
        ".............",
        "...RR...RR...",
        "..RRRR.RRRR..",
        ".RRRRRRRRRRR.",
        ".RRRRRRRRRRR.",
        ".RRRRRRRRRRR.",
        "..RRRRRRRRR..",
        "...RRRRRRR...",
        "....RRRRR....",
        ".....RRR.....",
        "......R......",
        "............."
      ]
    },
    {
      slug: "pastel-heart",
      name: "Pastel Heart",
      theme: "cute",
      difficulty: "easy",
      description: "The same friendly heart in bubblegum pink and lavender.",
      idea: "Make a set in three colourways and string them into a bag charm.",
      remap: { R: "M", M: "L", H: "U" },
      rows: [
        ".............",
        "...RR...RR...",
        "..RRRR.RRRR..",
        ".RRRRRRRRRRR.",
        ".RRRRRRRRRRR.",
        ".RRRRRRRRRRR.",
        "..RRRRRRRRR..",
        "...RRRRRRR...",
        "....RRRRR....",
        ".....RRR.....",
        "......R......",
        "............."
      ]
    },
    {
      slug: "daisy",
      name: "Daisy",
      theme: "flowers",
      difficulty: "easy",
      description: "Ten white petals around a yellow centre, with a short green stem.",
      idea: "Centre it on a 29 × 29 board with a plain border for a coaster, or glue it to a clip for your hair.",
      rows: [
        "...............",
        ".....WW.WW.....",
        "....WWWWWWW....",
        "...WWWWWWWWW...",
        "..WWWWYYYWWWW..",
        "..WWWWYYYWWWW..",
        "..WWWWYYYWWWW..",
        "...WWWWWWWWW...",
        "....WWWWWWW....",
        ".....WW.WW.....",
        ".......G.......",
        "......GGG......",
        ".......G.......",
        "......GGG......",
        "..............."
      ]
    },
    {
      slug: "mushroom",
      name: "Toadstool",
      theme: "cute",
      difficulty: "easy",
      description: "A red cap with cream spots and a chunky stem — a cottagecore favourite.",
      idea: "Make two and turn them into earrings, or add a loop for a plant-pot charm.",
      rows: [
        ".............",
        "....RRRRR....",
        "...RRRRRRR...",
        "..RRWWRRRRR..",
        "..RWWWRRRRR..",
        "..RRRRRRRRR..",
        "...RRRRRRR...",
        "....WWWWW....",
        "....WWWWW....",
        "...WWWWWWW...",
        "...WWWWWWW...",
        "....WWWWW....",
        "............."
      ]
    },
    {
      slug: "blue-toadstool",
      name: "Blue Toadstool",
      theme: "cute",
      difficulty: "easy",
      description: "A cool-toned toadstool with sky-blue spots and a pale stem.",
      idea: "Mix it with the red toadstool for a fairy-garden shelf.",
      remap: { R: "B", W: "J" },
      rows: [
        ".............",
        "....RRRRR....",
        "...RRRRRRR...",
        "..RRWWRRRRR..",
        "..RWWWRRRRR..",
        "..RRRRRRRRR..",
        "...RRRRRRR...",
        "....WWWWW....",
        "....WWWWW....",
        "...WWWWWWW...",
        "...WWWWWWW...",
        "....WWWWW....",
        "............."
      ]
    },
    {
      slug: "strawberry",
      name: "Strawberry",
      theme: "food",
      difficulty: "easy",
      description: "A ripe strawberry with a leafy crown and yellow seeds.",
      idea: "Stick one on a blank greeting card, or make a whole fruit bowl of magnets.",
      rows: [
        ".............",
        ".....GGG.....",
        "....GGGGG....",
        "...RRRRRRR...",
        "..RRRRRRRRR..",
        "..RYRRRYRRR..",
        "..RRRRRRRRR..",
        "..RRYRRRYRR..",
        "...RRRRRRR...",
        "....RRRRR....",
        ".....RRR.....",
        "......R......",
        "............."
      ]
    },
    {
      slug: "cat",
      name: "Little Cat",
      theme: "animals",
      difficulty: "easy",
      description: "A black cat with bright eyes and a tiny pink nose.",
      idea: "Use two colours of cat and add a bead collar in your favourite colour.",
      rows: [
        "...............",
        "..KK.......KK..",
        "..KKK.....KKK..",
        "..KKKK...KKKK..",
        "..KKKKKKKKKKK..",
        "..KKWKKKKKWKK..",
        "..KKKKKKKKKKK..",
        "..KKKKKKKKKKK..",
        "..KKKKKMKKKKK..",
        "...KKKKKKKKK...",
        "....KKKKKKK....",
        ".....KKKKK.....",
        "......KKK......"
      ]
    },
    {
      slug: "ginger-cat",
      name: "Ginger Cat",
      theme: "animals",
      difficulty: "easy",
      description: "The little cat in warm ginger and cream.",
      idea: "Make a pair of cats and hang them as a window charm.",
      remap: { K: "O", W: "C" },
      rows: [
        "...............",
        "..KK.......KK..",
        "..KKK.....KKK..",
        "..KKKK...KKKK..",
        "..KKKKKKKKKKK..",
        "..KKWKKKKKWKK..",
        "..KKKKKKKKKKK..",
        "..KKKKKKKKKKK..",
        "..KKKKKMKKKKK..",
        "...KKKKKKKKK...",
        "....KKKKKKK....",
        ".....KKKKK.....",
        "......KKK......"
      ]
    },
    {
      slug: "fox",
      name: "Fox Face",
      theme: "animals",
      difficulty: "medium",
      description: "Pointy ears, a white muzzle and a small dark nose.",
      idea: "Add a loop at the top for a backpack charm.",
      rows: [
        "...............",
        "..OO.......OO..",
        "..OOO.....OOO..",
        "..OOOO...OOOO..",
        "..OOOOOOOOOOO..",
        "..OOWOOOOOWOO..",
        "..OOOOOOOOOOO..",
        "..OOOOOKOOOOO..",
        "..OOOOOOOOOOO..",
        "...OOWWWWWOO...",
        "....OOWWWOO....",
        ".....OOOOO.....",
        "......OOO......"
      ]
    },
    {
      slug: "bunny",
      name: "Bunny",
      theme: "animals",
      difficulty: "easy",
      description: "Long ears, round cheeks and a tiny pink nose.",
      idea: "Glue it to a spring card, or tie it to an Easter basket as a gift tag.",
      rows: [
        ".............",
        "...W.....W...",
        "..WWW...WWW..",
        "..WWWW.WWWW..",
        "..WWWWWWWWW..",
        "..WWKWWWKWW..",
        "..WWWWWWWWW..",
        "...WWWMWWW...",
        "....WWWWW....",
        "....WWWWW....",
        ".....WWW.....",
        ".....WWW.....",
        "............."
      ]
    },
    {
      slug: "panda",
      name: "Panda",
      theme: "animals",
      difficulty: "medium",
      description: "A round panda face with sleepy eyes and a soft white muzzle.",
      idea: "Centre it on a 29 × 29 board with a pale background and frame it as a wall tile.",
      rows: [
        ".............",
        "...KK...KK...",
        "..KKKKKKKKK..",
        ".KKKKKKKKKKK.",
        ".KKWWWKKWWWK.",
        ".KWKWWKKWWKWK",
        ".KKWWWKKWWWKK",
        ".KKKKKKKKKKK.",
        ".KKKKKKKKKKK.",
        ".KKKWWWWWKKK.",
        "..KKWWWWWKK..",
        "...KKKKKKK...",
        "....KKKKK...."
      ]
    },
    {
      slug: "frog",
      name: "Frog",
      theme: "animals",
      difficulty: "easy",
      description: "A wide green frog with two bright eyes and a tiny smile.",
      idea: "Turn it into a bookmark by mounting it on a strip of card.",
      rows: [
        ".............",
        "...GG...GG...",
        "..GGGG.GGGG..",
        "..GGGGGGGGG..",
        "..GGWGGGWGG..",
        "..GGGGGGGGG..",
        "..GGGGGGGGG..",
        "..GGGKKKGGG..",
        "...GGGGGGG...",
        "....GGGGG....",
        ".....GGG.....",
        ".............",
        "............."
      ]
    },
    {
      slug: "goldfish",
      name: "Goldfish",
      theme: "animals",
      difficulty: "easy",
      description: "A side-on goldfish with a white eye and a flicked tail.",
      idea: "Mount it in a clear plastic ornament for a no-water fish bowl.",
      rows: [
        "...............",
        ".......OO......",
        "....OO.OO.OO...",
        "...OOOOOOOOO...",
        "..OOOOOOOOOOO..",
        "..OOWWOOOOOOO..",
        "..OOWKOOOOOOO..",
        "..OOWWOOOOOOO..",
        "...OOOOOOOOO...",
        "....OO.OO.OO...",
        ".......OO......"
      ]
    },
    {
      slug: "butterfly",
      name: "Butterfly",
      theme: "animals",
      difficulty: "medium",
      description: "Two pairs of wings in purple and blue around a slim body.",
      idea: "Glue a magnetic strip on the back for a fridge decoration.",
      rows: [
        ".............",
        "..P.......P..",
        ".PPP.....PPP.",
        ".PPPPP.PPPPP.",
        "..PPPPPPPPP..",
        "...PPPPPPP...",
        "....PPPPP....",
        "...PPPPPPP...",
        "..PP.PPP.PP..",
        ".BB..PPP..BB.",
        ".....P.P.....",
        ".............",
        "............."
      ]
    },
    {
      slug: "bee",
      name: "Busy Bee",
      theme: "animals",
      difficulty: "medium",
      description: "A round bee with black stripes and two little wings.",
      idea: "Hang it from a mobile with a length of invisible thread.",
      rows: [
        "...............",
        "....Y.....Y....",
        "...YYY...YYY...",
        "..YYYYYYYYYYY..",
        "..YYKYYYYYKYY..",
        "..YYYYYYYYYYY..",
        "..YYYYYYYYYYY..",
        "...YYYYYYYYY...",
        "....Y.Y.Y.Y....",
        "...K..K..K.....",
        "..............."
      ]
    },
    {
      slug: "dinosaur",
      name: "Little Dino",
      theme: "animals",
      difficulty: "medium",
      description: "A long-necked dinosaur with a friendly eye and four stubby legs.",
      idea: "Make a set of mini dinos in different colours and stand them on a shelf.",
      rows: [
        "...............",
        ".........GGG...",
        "........GGGGG..",
        ".......GGGGGG..",
        ".....GGGGGGGG..",
        "....GGGGGGGGG..",
        "G...GGGGGGGGG..",
        "GG.GGGGGGGGGG..",
        "GGGGGGGGGGGGG..",
        ".GGGGGGGGGGGG..",
        "..GGGGGGGGGG...",
        "...GGGGGGGG....",
        "....GG..GG....."
      ]
    },
    {
      slug: "rocket",
      name: "Rocket",
      theme: "space",
      difficulty: "medium",
      description: "A red-nosed rocket with a round window and orange flames.",
      idea: "Use it as a cupcake topper by taping a cocktail stick to the back.",
      rows: [
        "......R......",
        ".....RRR.....",
        "....RRRRR....",
        "...RRRRRRR...",
        "...RWWWWWR...",
        "...RWWWWWR...",
        "...RWWWWWR...",
        "...RRRRRRR...",
        "..R.OOOO.R...",
        "..R.OOOO.R...",
        "...RRRRRRR...",
        "....RRRRR....",
        "....O...O....",
        "...OO...OO...",
        "............."
      ]
    },
    {
      slug: "mint-rocket",
      name: "Mint Rocket",
      theme: "space",
      difficulty: "medium",
      description: "A cool mint-and-teal rocket for a space-themed bedroom.",
      idea: "Make a garland by hanging three rockets at different heights.",
      remap: { R: "T", O: "V", W: "J" },
      rows: [
        "......R......",
        ".....RRR.....",
        "....RRRRR....",
        "...RRRRRRR...",
        "...RWWWWWR...",
        "...RWWWWWR...",
        "...RWWWWWR...",
        "...RRRRRRR...",
        "..R.OOOO.R...",
        "..R.OOOO.R...",
        "...RRRRRRR...",
        "....RRRRR....",
        "....O...O....",
        "...OO...OO...",
        "............."
      ]
    },
    {
      slug: "ringed-planet",
      name: "Ringed Planet",
      theme: "space",
      difficulty: "medium",
      description: "A purple planet with a tilted sky-blue ring.",
      idea: "Pair it with the rocket and a star for a three-piece space mobile.",
      rows: [
        "...............",
        "......PPPP.....",
        "....PPPPPPPP...",
        "...PPPPPPPPPP..",
        "..PPPPPPPPPPPP.",
        "..PPPPPPPPPPPP.",
        "...PPPPPPPPPP..",
        "....PPPPPPPP...",
        ".....PPPPPP....",
        "....TJJJJJT....",
        "...TJJJJJJJT...",
        "..TJJJJJJJJJT..",
        "...TJJJJJJJT...",
        "....TTTTTTT....",
        "..............."
      ]
    },
    {
      slug: "star",
      name: "Gold Star",
      theme: "space",
      difficulty: "easy",
      description: "A five-point star that works as a tree topper or a reward token.",
      idea: "Fill a small jar with star patterns in different metallic colours.",
      rows: [
        ".............",
        "......Y......",
        ".....YYY.....",
        ".....YYY.....",
        "....YYYYY....",
        ".YYYYYYYYYYY.",
        "..YYYYYYYYY..",
        "...YYYYYYY...",
        "....YYYYY....",
        "...YYYYYYY...",
        "..YYYY.YYYY..",
        ".YYY.....YYY.",
        "............."
      ]
    },
    {
      slug: "rainbow",
      name: "Rainbow",
      theme: "cute",
      difficulty: "easy",
      description: "A six-band rainbow with a soft cloud-shaped glow.",
      idea: "Hang it in a window and add a tiny cloud charm at each end.",
      rows: [
        "...............",
        "....RRRRRRR....",
        "...ROOOOOOOR...",
        "..ROOYYYYYOOR..",
        ".ROOYYGGGYYOOR.",
        ".ROYYGGGGGYOR..",
        ".ROYYGGGGGYOR..",
        ".ROYYGGGGGYOR..",
        "..ROYYYYYYYOR..",
        "...ROOOOOOOR...",
        "....RRRRRRR...."
      ]
    },
    {
      slug: "smiley",
      name: "Smiley",
      theme: "retro",
      difficulty: "easy",
      description: "A bold yellow smiley with a wide grin and two dark eyes.",
      idea: "Make a stack of them as friendship tokens, or add a pin back.",
      rows: [
        "...........",
        "...YYYYY...",
        "..YYYYYYY..",
        ".YYYYYYYYY.",
        ".YYKYYYKYY.",
        ".YYYYYYYYY.",
        ".YYYYYYYYY.",
        ".YYYKKKYYY.",
        "..YYYYYYY..",
        "...YYYYY...",
        "..........."
      ]
    },
    {
      slug: "ghost",
      name: "Friendly Ghost",
      theme: "holiday",
      difficulty: "easy",
      description: "A softly waving ghost with dark eyes and a scalloped hem.",
      idea: "Make a Halloween garland by threading five ghosts on baker's twine.",
      rows: [
        "...........",
        "...WWWWW...",
        "..WWWWWWW..",
        ".WWWWWWWWW.",
        ".WWWWWWWWW.",
        ".WWKWWWKWW.",
        ".WWWWWWWWW.",
        ".WWWWWWWWW.",
        ".WWWWWWWWW.",
        ".WWWWWWWWW.",
        ".WWWWWWWWW.",
        ".WWW.W.WWW.",
        "..........."
      ]
    },
    {
      slug: "pumpkin",
      name: "Pumpkin",
      theme: "holiday",
      difficulty: "easy",
      description: "A plump orange pumpkin with a green stem and two bright eyes.",
      idea: "Use it as a name-card holder for a Halloween table.",
      rows: [
        ".............",
        "....G.G......",
        ".....G.......",
        "..OOO...OOO..",
        ".OOOOOOOOOOO.",
        ".OOOOOOOOOOO.",
        ".OOOXOOOXOOO.",
        ".OOOOOOOOOOO.",
        ".OOOOOOOOOOO.",
        "..OOOOOOOOO..",
        "...OOOOOOO...",
        "....OOOOO....",
        "............."
      ]
    },
    {
      slug: "christmas-tree",
      name: "Christmas Tree",
      theme: "holiday",
      difficulty: "easy",
      description: "A layered green tree with a yellow star and a sturdy brown trunk.",
      idea: "Make three in different greens and arrange them as a table centrepiece.",
      rows: [
        "......Y......",
        ".....GGG.....",
        "....GGGGG....",
        "...GGGGGGG...",
        "....GGGGG....",
        "...GGGGGGG...",
        "..GGRGGGRGG..",
        ".GGGGGGGGGGG.",
        "..GGGGGGGGG..",
        "...GGGGGGG...",
        "....GGGGG....",
        "......E......",
        "......E......",
        ".....EEE.....",
        "............."
      ]
    },
    {
      slug: "game-controller",
      name: "Game Controller",
      theme: "retro",
      difficulty: "medium",
      description: "A chunky black controller with two white buttons and a D-pad.",
      idea: "Mount it on a desk stand for a tiny piece of gaming history.",
      rows: [
        "...............",
        "...KKKKKKKKK...",
        "..KKKKKKKKKKK..",
        ".KKWWKKKKKWWKK.",
        ".KKWWKKKKKWWKK.",
        ".KKKKKKKKKKKKK.",
        ".KKKKKKKKKKKKK.",
        "..KKKK...KKKK..",
        "...KK.....KK..."
      ]
    },
    {
      slug: "cassette",
      name: "Cassette Tape",
      theme: "retro",
      difficulty: "medium",
      description: "A classic cassette with two reels and a chunky label area.",
      idea: "Make a mixtape-themed gift tag for a friend's birthday.",
      rows: [
        "...............",
        ".KKKKKKKKKKKKK.",
        ".KWWWWWWWWWWWK.",
        ".KWKKKKKKKKKWK.",
        ".KWKWWWWWWWKWK.",
        ".KWKKKKKKKKKWK.",
        ".KWWWWWWWWWWWK.",
        ".KKKKKKKKKKKKK.",
        "..............."
      ]
    },
    {
      slug: "cube",
      name: "3D Cube",
      theme: "3d",
      difficulty: "medium",
      description: "A small isometric cube built from three shades of blue.",
      idea: "Stack cubes in different colours to build a corner bookshelf sculpture.",
      rows: [
        ".............",
        "....AAAAA....",
        "...AAAAAAA...",
        "..AAAAABBBB..",
        ".AAAAAABBBBB.",
        ".AAAAAABBBBB.",
        ".AAAAAABBBBB.",
        ".AAAAAABBBBB.",
        "..CCCCCCCCCC.",
        "...CCCCCCCCC.",
        "....CCCCCCC..",
        ".....CCCCC...",
        "............."
      ]
    },
    {
      slug: "3d-heart",
      name: "3D Heart",
      theme: "3d",
      difficulty: "medium",
      description: "A heart with a shaded left lobe and a darker right lobe for depth.",
      idea: "Use it as the centrepiece of a Valentine's Day wreath.",
      rows: [
        ".............",
        "...MM...MM...",
        "..MLLM.MRRM..",
        ".MLLLLMRRRRM.",
        ".MLLLLRRRRRM.",
        ".MLLLRRRRRRM.",
        "..MLRRRRRRM..",
        "...MRRRRRM...",
        "....MRRRM....",
        ".....MRM.....",
        "......M......",
        ".............",
        "............."
      ]
    },
    {
      slug: "alien",
      name: "Little Alien",
      theme: "space",
      difficulty: "easy",
      description: "A green alien with antennae and a curious little mouth.",
      idea: "Add a glow-in-the-dark bead for the eyes and use it as a night-light charm.",
      rows: [
        "...........",
        "..K.....K..",
        "...K...K...",
        "..GGGGGGG..",
        ".GGGGGGGGG.",
        ".GGWGGGWGG.",
        ".GGGGGGGGG.",
        ".GGGGKGGGG.",
        "..GGGGGGG..",
        "...GGGGG...",
        "....G.G....",
        "...G...G...",
        "..........."
      ]
    }
  ];

  var THEMES = [
    { id: "all", label: "All designs" },
    { id: "animals", label: "Animals" },
    { id: "cute", label: "Cute" },
    { id: "flowers", label: "Flowers" },
    { id: "food", label: "Food" },
    { id: "space", label: "Space" },
    { id: "retro", label: "Retro" },
    { id: "holiday", label: "Holiday" },
    { id: "3d", label: "3D" }
  ];

  var THEME_LABELS = {};
  THEMES.forEach(function (t) { THEME_LABELS[t.id] = t.label; });

  function normalizeRows(def) {
    return def.rows.map(function (row) { return row.replace(/\s+/g, ""); });
  }

  /**
   * @param {object} def
   * @param {{colors:Array}} palette
   * @returns {{w:number,h:number,cells:Int16Array,counts:number[],total:number,palette:object}}
   */
  function toPattern(def, palette) {
    var rows = normalizeRows(def);
    var h = rows.length;
    var w = rows[0] ? rows[0].length : 0;
    if (!w) throw new Error("Pattern " + def.slug + " has no rows");
    var cells = new Int16Array(w * h);
    var counts = new Array(palette.colors.length).fill(0);
    var total = 0;

    for (var y = 0; y < h; y++) {
      if (rows[y].length !== w) {
        throw new Error("Pattern " + def.slug + " row " + y + " is " + rows[y].length + " wide, expected " + w);
      }
      for (var x = 0; x < w; x++) {
        var ch = rows[y][x];
        if (ch === "." || ch === " ") {
          cells[y * w + x] = -1;
          continue;
        }
        if (def.remap && def.remap[ch]) ch = def.remap[ch];
        var found = -1;
        for (var c = 0; c < palette.colors.length; c++) {
          if (palette.colors[c].code === ch) { found = c; break; }
        }
        if (found < 0) throw new Error("Pattern " + def.slug + " uses unknown bead code " + ch);
        cells[y * w + x] = found;
        counts[found]++;
        total++;
      }
    }

    return { w: w, h: h, cells: cells, counts: counts, total: total, palette: palette, def: def };
  }

  function find(slug) {
    for (var i = 0; i < LIST.length; i++) {
      if (LIST[i].slug === slug) return LIST[i];
    }
    return null;
  }

  function byTheme(theme) {
    if (!theme || theme === "all") return LIST.slice();
    return LIST.filter(function (d) { return d.theme === theme; });
  }

  function dimensions(def) {
    var rows = normalizeRows(def);
    return { w: rows[0].length, h: rows.length };
  }

  return {
    LIST: LIST,
    THEMES: THEMES,
    THEME_LABELS: THEME_LABELS,
    toPattern: toPattern,
    find: find,
    byTheme: byTheme,
    dimensions: dimensions
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BPMPatterns;
