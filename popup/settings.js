import { DEFAULT_SETTINGS } from "./constants.js";

export function renderCategoryOptions(categories) {
  const container = document.getElementById("categoryList");
  container.innerHTML = "";

  categories.forEach((category) => {
    const label = document.createElement("label");
    label.className = "category-item";
    label.innerHTML = `
      <input type="checkbox" name="noticeCategory" value="${category}">
      <span>${category}</span>
    `;
    container.appendChild(label);
  });
}

export function bindCategorySelectionRules() {
  const categoryCheckboxes = [...document.querySelectorAll('input[name="noticeCategory"]')];
  const allCheckbox = categoryCheckboxes.find((checkbox) => checkbox.value === "전체");

  if (!allCheckbox) {
    return;
  }

  allCheckbox.addEventListener("change", () => {
    if (!allCheckbox.checked) {
      return;
    }

    categoryCheckboxes.forEach((checkbox) => {
      checkbox.checked = checkbox.value === "전체";
    });
  });

  categoryCheckboxes
    .filter((checkbox) => checkbox.value !== "전체")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          allCheckbox.checked = false;
        }

        const checkedSpecific = categoryCheckboxes.some(
          (item) => item.value !== "전체" && item.checked
        );

        if (!checkedSpecific) {
          allCheckbox.checked = true;
        }
      });
    });
}

export async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  applySelectedCategories(settings.selectedNoticeCategories);
}

export async function saveSettings(afterSave) {
  const selectedNoticeCategories = normalizeSelectedCategories(
    [...document.querySelectorAll('input[name="noticeCategory"]:checked')].map(
      (checkbox) => checkbox.value
    )
  );

  await chrome.storage.sync.set({
    refreshMinutes: DEFAULT_SETTINGS.refreshMinutes,
    selectedNoticeCategories
  });

  document.getElementById("settingsStatus").textContent = "설정이 저장되었습니다.";

  if (afterSave) {
    await afterSave();
  }

  document.getElementById("settingsPanel").classList.add("is-collapsed");
}

export async function getStoredSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}

function applySelectedCategories(selectedCategories) {
  const categoryCheckboxes = [...document.querySelectorAll('input[name="noticeCategory"]')];
  const useAll = !selectedCategories.length || selectedCategories.includes("전체");

  categoryCheckboxes.forEach((checkbox) => {
    if (useAll) {
      checkbox.checked = checkbox.value === "전체";
      return;
    }

    checkbox.checked = selectedCategories.includes(checkbox.value);
  });
}

function normalizeSelectedCategories(categories) {
  if (!categories.length || categories.includes("전체")) {
    return ["전체"];
  }

  return categories;
}
