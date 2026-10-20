/* Gallery filtering for the design / idea / pattern pages.
   Cards are static HTML with real <img> previews; this only toggles them. */
(function () {
  "use strict";

  var bar = document.querySelector("[data-filter-bar]");
  if (!bar) return;

  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-gallery] .pattern-card"));
  var count = document.querySelector("[data-gallery-count]");

  function setFilter(filter, scroll) {
    var shown = 0;
    cards.forEach(function (card) {
      var match = filter === "all" || card.getAttribute("data-tag") === filter;
      card.hidden = !match;
      if (match) shown++;
    });
    var buttons = bar.querySelectorAll("button[data-filter]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-filter") === filter));
    }
    if (count) {
      var noun = /pattern/i.test(location.pathname) ? "printable charts" : "designs";
      count.innerHTML = "<b>" + shown + "</b> " + noun;
    }
    if (scroll) {
      var top = bar.getBoundingClientRect().top + window.scrollY - 88;
      if (window.scrollY > top + 120) window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  bar.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    setFilter(btn.getAttribute("data-filter"), true);
  });

  var hash = (location.hash || "").replace(/^#/, "");
  if (hash && document.querySelector('[data-filter="' + hash + '"]')) {
    setFilter(hash, false);
  } else {
    setFilter("all", false);
  }
})();
