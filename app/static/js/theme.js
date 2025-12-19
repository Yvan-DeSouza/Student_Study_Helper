const toggle = document.querySelector(".theme-toggle");

toggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  document.documentElement.setAttribute(
    "data-theme",
    current === "dark" ? "light" : "dark"
  );
});
