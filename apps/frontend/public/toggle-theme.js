const primaryColorScheme = ""; // "light" | "dark"

const currentTheme = localStorage.getItem("theme");

function getPreferTheme() {
  if (currentTheme) return currentTheme;

  if (primaryColorScheme) return primaryColorScheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let themeValue = getPreferTheme();

function setPreference() {
  localStorage.setItem("theme", themeValue);
  reflectPreference();
}

function reflectPreference() {
  document.firstElementChild.setAttribute("data-theme", themeValue);

  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);

  const body = document.body;

  if (body) {
    const computedStyles = window.getComputedStyle(body);
    const bgColor = computedStyles.backgroundColor;

    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
}

reflectPreference();

window.onload = () => {
  function setThemeFeature() {
    reflectPreference();

    document.querySelector("#theme-btn")?.addEventListener("click", () => {
      // light -> dark -> spring -> light
      if (themeValue === "light") {
        themeValue = "dark";
      } else if (themeValue === "dark") {
        themeValue = "spring";
      } else {
        themeValue = "light";
      }
      setPreference();
    });
  }

  setThemeFeature();

  document.addEventListener("astro:after-swap", setThemeFeature);
};

document.addEventListener("astro:before-swap", (event) => {
  const bgColor = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  event.newDocument
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bgColor);
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches: isDark }) => {
    themeValue = isDark ? "dark" : "light";
    setPreference();
  });
