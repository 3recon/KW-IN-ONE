const DEFAULT_SETTINGS = {
  refreshMinutes: 30,
  pinnedLinks: ["klas", "kw-home", "e-learning", "webmail"],
  selectedNoticeCategories: ["전체"]
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  const nextSettings = { ...DEFAULT_SETTINGS, ...stored };

  await chrome.storage.sync.set(nextSettings);
  await ensureRefreshAlarm(nextSettings.refreshMinutes);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes.refreshMinutes) {
    return;
  }

  ensureRefreshAlarm(changes.refreshMinutes.newValue);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "refreshNotices") {
    return;
  }
  const updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ lastRefreshAt: updatedAt });
});

async function ensureRefreshAlarm(refreshMinutes) {
  const periodInMinutes = Math.max(15, Number(refreshMinutes) || DEFAULT_SETTINGS.refreshMinutes);
  await chrome.alarms.clear("refreshNotices");
  await chrome.alarms.create("refreshNotices", { periodInMinutes });
}
