!(function () {
  try {
    var root = document.documentElement;
    root.classList.add("no-transition");
    var site = {};
    try { site = JSON.parse(localStorage.getItem("corner:site") || "{}"); } catch (_) { site = {}; }
    root.dataset.font = site.fontPreset || localStorage.getItem("font-preset") || "ayuan";

    var theme = "auto";
    try {
      site = JSON.parse(localStorage.getItem("corner:site") || "{}");
      theme = site.theme || localStorage.getItem("theme") || "auto";
    } catch (_) { theme = localStorage.getItem("theme") || "auto"; }
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
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor)
      themeColor.setAttribute(
        "content",
        spaceRoute ? "#030712" : dark ? "#030b18" : "#eaf5ff",
      );
  } catch (_) {}
})();
