const defaults = {
  notificationsEnabled: true,
  refreshMinutes: 30
};

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await chrome.storage.sync.get(defaults);
  document.getElementById("notificationsEnabled").checked = settings.notificationsEnabled;
  document.getElementById("refreshMinutes").value = settings.refreshMinutes;

  document.getElementById("saveButton").addEventListener("click", saveSettings);
});

async function saveSettings() {
  const notificationsEnabled = document.getElementById("notificationsEnabled").checked;
  const refreshMinutes = Number(document.getElementById("refreshMinutes").value) || defaults.refreshMinutes;

  await chrome.storage.sync.set({
    notificationsEnabled,
    refreshMinutes
  });

  document.getElementById("status").textContent = "설정이 저장되었습니다.";
}
