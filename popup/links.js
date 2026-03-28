import { QUICK_LINKS } from "./constants.js";

export function renderQuickLinks() {
  const container = document.getElementById("quickLinks");
  container.innerHTML = "";

  QUICK_LINKS.forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "link-card";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.innerHTML = `<span class="link-title">${link.title}</span>`;
    container.appendChild(anchor);
  });
}
