const defaults = {
  notificationsEnabled: true,
  refreshMinutes: 30,
  selectedNoticeCategories: ["전체"]
};

document.addEventListener("DOMContentLoaded", async () => {
  renderCategoryOptions(window.KW_NOTICE_CATEGORIES || []);

  const settings = await chrome.storage.sync.get(defaults);
  document.getElementById("notificationsEnabled").checked = settings.notificationsEnabled;
  document.getElementById("refreshMinutes").value = settings.refreshMinutes;
  applySelectedCategories(settings.selectedNoticeCategories);

  document.getElementById("saveButton").addEventListener("click", saveSettings);
});

function renderCategoryOptions(categories) {
  const container = document.getElementById("categoryList");
  container.innerHTML = "";

  categories.forEach((category) => {
    const label = document.createElement("label");
    label.className = "checkbox-label";
    label.innerHTML = `
      <input type="checkbox" name="noticeCategory" value="${category}">
      <span>${category}</span>
    `;
    container.appendChild(label);
  });

  const allCheckbox = container.querySelector('input[value="전체"]');
  const categoryCheckboxes = [...container.querySelectorAll('input[name="noticeCategory"]')];

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

async function saveSettings() {
  const notificationsEnabled = document.getElementById("notificationsEnabled").checked;
  const refreshMinutes =
    Number(document.getElementById("refreshMinutes").value) || defaults.refreshMinutes;
  const checkedCategories = [
    ...document.querySelectorAll('input[name="noticeCategory"]:checked')
  ].map((checkbox) => checkbox.value);
  const selectedNoticeCategories = normalizeSelectedCategories(checkedCategories);

  await chrome.storage.sync.set({
    notificationsEnabled,
    refreshMinutes,
    selectedNoticeCategories
  });

  document.getElementById("status").textContent = "설정이 저장되었습니다.";
}

function normalizeSelectedCategories(categories) {
  if (!categories.length || categories.includes("전체")) {
    return ["전체"];
  }

  return categories;
}
