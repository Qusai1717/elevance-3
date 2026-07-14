/* ElevanceYVR — gallery category filter */
(function () {
  "use strict";
  var buttons = document.querySelectorAll(".filter-btn");
  var items = document.querySelectorAll(".gallery-item");
  if (!buttons.length) return;
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var f = btn.getAttribute("data-filter");
      items.forEach(function (item) {
        var cats = (item.getAttribute("data-cat") || "").split(/\s+/);
        item.classList.toggle("hidden", f !== "all" && cats.indexOf(f) === -1);
      });
    });
  });
})();
