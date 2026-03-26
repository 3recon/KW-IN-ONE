const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  refreshMinutes: 30,
  pinnedLinks: ["klas", "kw-home", "e-learning", "webmail"]
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

  const { notificationsEnabled } = await chrome.storage.sync.get("notificationsEnabled");
  const updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ lastRefreshAt: updatedAt });

  if (!notificationsEnabled) {
    return;
  }

  chrome.notifications.create({
    type: "basic",
    iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p4fNwAAAABJRU5ErkJggg==",
    title: "KW IN ONE",
    message: "공지 새로고침이 실행되었습니다. 실제 공지 수집 로직은 다음 단계에서 연결됩니다."
  });
});

async function ensureRefreshAlarm(refreshMinutes) {
  const periodInMinutes = Math.max(15, Number(refreshMinutes) || DEFAULT_SETTINGS.refreshMinutes);
  await chrome.alarms.clear("refreshNotices");
  await chrome.alarms.create("refreshNotices", { periodInMinutes });
}
