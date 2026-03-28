import { SAMPLE_MEALS } from "./constants.js";
import { renderQuickLinks } from "./links.js";
import { renderPhonebook } from "./phonebook.js";
import { bindDiningOpen, loadDiningMenus, renderMealSection } from "./dining.js";
import {
  bindCategorySelectionRules,
  loadSettings,
  renderCategoryOptions,
  saveSettings
} from "./settings.js";
import { loadLatestNotices } from "./notices.js";

document.addEventListener("DOMContentLoaded", async () => {
  renderQuickLinks();
  renderCategoryOptions(window.KW_NOTICE_CATEGORIES || []);
  renderPhonebook(window.KW_PHONEBOOK || []);
  renderMealSection(SAMPLE_MEALS);
  bindEvents();
  await loadSettings();
  await Promise.all([loadLatestNotices(), loadDiningMenus()]);
});

function bindEvents() {
  document.getElementById("toggleSettings").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("is-collapsed");
  });

  bindDiningOpen();

  document.getElementById("saveSettings").addEventListener("click", async () => {
    await saveSettings(loadLatestNotices);
  });

  bindCategorySelectionRules();
}
