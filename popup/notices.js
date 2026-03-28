import { DEFAULT_SETTINGS, NOTICE_URL, SAMPLE_NOTICES } from "./constants.js";
import { getStoredSettings } from "./settings.js";

export async function loadLatestNotices() {
  try {
    const response = await fetch(NOTICE_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const rawNotices = parseKwNotices(html);
    const settings = await getStoredSettings();
    const filteredNotices = filterNoticesByCategory(
      rawNotices,
      settings.selectedNoticeCategories
    );

    if (!filteredNotices.length) {
      renderNotices([
        {
          source: "광운대 공지",
          category: "설정",
          title: "선택한 카테고리에 해당하는 공지가 없습니다.",
          url: NOTICE_URL,
          publishedAt: "필터 결과"
        }
      ]);
      return;
    }

    const latest = filteredNotices.slice(0, 3);
    renderNotices(latest);
    await chrome.storage.local.set({ latestNotices: latest });
  } catch (error) {
    const { latestNotices } = await chrome.storage.local.get("latestNotices");
    renderNotices(latestNotices?.length ? latestNotices : SAMPLE_NOTICES);
  }
}

export function renderNotices(notices) {
  const list = document.getElementById("noticeList");
  list.innerHTML = "";

  notices.forEach((notice) => {
    const item = document.createElement("li");
    item.className = "notice-item";
    item.innerHTML = `
      <span class="notice-source">${notice.source} · ${notice.category}</span>
      <a class="notice-link" href="${notice.url}" target="_blank" rel="noreferrer">${notice.title}</a>
      <div class="notice-date">${notice.publishedAt}</div>
    `;
    list.appendChild(item);
  });
}

function parseKwNotices(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const anchors = [...doc.querySelectorAll('a[href*="BoardMode=view&DUID="]')];
  const seen = new Set();
  const notices = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    const parsedTitle = parseCategoryAndTitle(anchor.textContent || "");

    if (!href || !parsedTitle.title || seen.has(href)) {
      continue;
    }

    notices.push({
      source: "광운대 공지",
      category: parsedTitle.category,
      title: parsedTitle.title,
      url: new URL(href, NOTICE_URL).toString(),
      publishedAt: extractNearbyDate(anchor) || "수정일 정보 없음"
    });

    seen.add(href);
  }

  return notices;
}

function parseCategoryAndTitle(value) {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/신규게시글/g, "")
    .replace(/Attachment/g, "")
    .trim();

  const match = normalized.match(/^\[([^\]]+)\]\s*(.+)$/);

  if (!match) {
    return { category: "일반", title: normalized };
  }

  return {
    category: match[1].trim(),
    title: match[2].trim()
  };
}

function filterNoticesByCategory(notices, selectedCategories = DEFAULT_SETTINGS.selectedNoticeCategories) {
  if (!selectedCategories.length || selectedCategories.includes("전체")) {
    return notices;
  }

  return notices.filter((notice) => selectedCategories.includes(notice.category));
}

function extractNearbyDate(anchor) {
  const candidateTexts = [];
  let current = anchor.parentElement;

  for (let index = 0; index < 3 && current; index += 1) {
    const text = current.textContent?.replace(/\s+/g, " ").trim();

    if (text) {
      candidateTexts.push(text);
    }

    const next = current.nextElementSibling;
    if (next?.textContent) {
      candidateTexts.push(next.textContent.replace(/\s+/g, " ").trim());
    }

    current = current.parentElement;
  }

  for (const text of candidateTexts) {
    const modifiedMatch = text.match(/수정일\s*(\d{4}[.-]\d{2}[.-]\d{2})/);

    if (modifiedMatch) {
      return modifiedMatch[1];
    }

    const dateMatch = text.match(/\d{4}[.-]\d{2}[.-]\d{2}/);

    if (dateMatch) {
      return dateMatch[0];
    }
  }

  return "";
}
