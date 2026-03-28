const DEFAULT_SETTINGS = {
  selectedNoticeCategories: ["전체"]
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  const nextSettings = { ...DEFAULT_SETTINGS, ...stored };

  await chrome.storage.sync.set(nextSettings);
});
