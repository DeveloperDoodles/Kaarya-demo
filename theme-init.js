// Apply the saved theme before first paint to avoid a flash. Kept as a file so the
// Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem("of-theme");
  if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches))
    document.documentElement.classList.add("dark");
} catch (e) {}
