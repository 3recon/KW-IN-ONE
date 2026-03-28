import { DEPARTMENT_LINKS, QUICK_LINKS } from "./constants.js";

export function renderQuickLinks() {
  const container = document.getElementById("quickLinks");
  container.innerHTML = "";

  QUICK_LINKS.forEach((link) => {
    if (link.action === "open-departments") {
      const button = document.createElement("button");
      button.className = "link-card link-card-button";
      button.type = "button";
      button.id = "openDepartments";
      button.innerHTML = `<span class="link-title">${link.title}</span>`;
      container.appendChild(button);
      return;
    }

    const anchor = document.createElement("a");
    anchor.className = "link-card";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.innerHTML = `<span class="link-title">${link.title}</span>`;
    container.appendChild(anchor);
  });
}

export function renderDepartmentLinks() {
  const container = document.getElementById("departmentList");
  container.innerHTML = "";

  DEPARTMENT_LINKS.forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "department-link";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = link.title;
    container.appendChild(anchor);
  });
}

export function bindDepartmentModal() {
  const modal = document.getElementById("departmentModal");
  const openButton = document.getElementById("openDepartments");
  const closeButton = document.getElementById("closeDepartments");
  const backdrop = document.getElementById("departmentBackdrop");

  openButton?.addEventListener("click", () => {
    modal.classList.remove("is-collapsed");
  });

  closeButton?.addEventListener("click", () => {
    modal.classList.add("is-collapsed");
  });

  backdrop?.addEventListener("click", () => {
    modal.classList.add("is-collapsed");
  });
}
