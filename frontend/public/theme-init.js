!(function () {
  try {
    var root = document.documentElement;
    root.classList.add("no-transition");
    var site = {};
    try {
      site = JSON.parse(localStorage.getItem("corner:site") || "{}");
    } catch (_) {
      site = {};
    }
    root.dataset.font =
      site.fontPreset || localStorage.getItem("font-preset") || "ayuan";
    root.dataset.palette =
      ["fresh", "ocean", "sakura"].indexOf(site.palette) >= 0
        ? site.palette
        : "fresh";

    var theme = "auto";
    try {
      site = JSON.parse(localStorage.getItem("corner:site") || "{}");
      theme = site.theme || localStorage.getItem("theme") || "auto";
    } catch (_) {
      theme = localStorage.getItem("theme") || "auto";
    }
    var dark =
      theme === "dark" ||
      (theme === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
    var spaceRoute =
      location.pathname === "/" || location.pathname === "/time/constellation";
    root.classList.toggle("space-route", spaceRoute);
    root.dataset.theme = dark ? "dark" : "light";
    root.style.colorScheme = dark ? "dark" : "light";
    var colors = {
      fresh: ["#eaf5ff", "#030b18"],
      ocean: ["#e8f1fb", "#04101d"],
      sakura: ["#fff3f7", "#1b0c13"],
    };
    var pair = colors[root.dataset.palette] || colors.fresh;
    var themeColor = pair[dark ? 1 : 0];
    if (spaceRoute) themeColor = "#030712";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeColor);
  } catch (_) {}
})();
