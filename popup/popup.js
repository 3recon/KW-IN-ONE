const QUICK_LINKS = [
  { id: "klas", title: "KLAS", url: "https://klas.kw.ac.kr/" },
  { id: "kw-home", title: "광운대 홈페이지", url: "https://www.kw.ac.kr/ko/" },
  { id: "e-learning", title: "E-러닝", url: "https://selc.or.kr/lms/main/MainView.do" },
  { id: "k-mooc", title: "K-MOOC", url: "https://www.kmooc.kr/" },
  { id: "webmail", title: "웹메일", url: "https://wmail.kw.ac.kr/" },
  { id: "everytime", title: "에브리타임", url: "https://kw.everytime.kr/" },
  { id: "dining", title: "학식", url: "https://www.kw.ac.kr/ko/life/facility11.jsp" }
];

const NOTICE_URL =
  "https://www.kw.ac.kr/ko/life/notice.jsp?srCategoryId=&mode=list&searchKey=1&searchVal=";
const DINING_URL = "https://www.kw.ac.kr/ko/life/facility11.jsp";

const DEFAULT_SETTINGS = {
  refreshMinutes: 30,
  selectedNoticeCategories: ["전체"]
};

const SAMPLE_NOTICES = [
  {
    source: "광운대 공지",
    category: "일반",
    title: "공지사항을 불러오지 못해 예시 공지가 표시됩니다.",
    url: NOTICE_URL,
    publishedAt: "지금"
  },
  {
    source: "광운대 공지",
    category: "학사",
    title: "설정 화면에서 필요한 카테고리만 선택할 수 있습니다.",
    url: NOTICE_URL,
    publishedAt: "MVP"
  },
  {
    source: "광운대 공지",
    category: "학생",
    title: "선택한 카테고리에 맞는 공지만 3건까지 노출합니다.",
    url: NOTICE_URL,
    publishedAt: "안내"
  }
];

const SAMPLE_MEALS = {
  date: "오늘",
  focusLabel: "예시 식단",
  entries: [
    {
      name: "천원의 아침",
      time: "08:30 ~ 09:30",
      items: ["토스트", "스크램블 에그", "샐러드"]
    },
    {
      name: "자율중식",
      time: "11:30 ~ 14:00",
      items: ["제육볶음", "된장국", "김치", "쌀밥"]
    }
  ]
};

document.addEventListener("DOMContentLoaded", async () => {
  renderQuickLinks();
  renderCategoryOptions(window.KW_NOTICE_CATEGORIES || []);
  renderPhonebook(window.KW_PHONEBOOK || []);
  renderMealSection(SAMPLE_MEALS);
  bindEvents();
  await loadSettings();
  await Promise.all([loadLatestNotices(), loadDiningMenus()]);
});

function renderQuickLinks() {
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

function renderCategoryOptions(categories) {
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

function renderPhonebook(entries) {
  const select = document.getElementById("phonebookCategory");
  const categories = [...new Set(entries.map((entry) => entry.category))];

  select.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  drawPhoneList(entries, categories[0]);

  select.addEventListener("change", (event) => {
    drawPhoneList(entries, event.target.value);
  });
}

function drawPhoneList(entries, category) {
  const list = document.getElementById("phoneList");
  list.innerHTML = "";

  entries
    .filter((entry) => entry.category === category)
    .forEach((entry) => {
      const item = document.createElement("li");
      item.className = "phone-item";
      item.innerHTML = `
        <div>${entry.name}</div>
        <div class="phone-number">${entry.phone}</div>
      `;
      list.appendChild(item);
    });
}

function renderNotices(notices) {
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

function renderMealSection(mealState) {
  const labelNode = document.getElementById("mealLabel");
  const summaryNode = document.getElementById("mealSummary");

  labelNode.textContent = mealState.focusLabel;
  summaryNode.innerHTML = mealState.entries
    .map(
      (entry) => `
        <div class="meal-card">
          <span class="meal-heading">
            ${entry.name}
            <span class="meal-time">(${entry.time})</span>
          </span>
          <div class="meal-items">
            ${renderMealLines(entry.items)}
          </div>
        </div>
      `
    )
    .join("");
}

function renderMealLines(items) {
  if (!items.length) {
    return "<span>운영 정보 없음</span>";
  }

  const lines = [];

  for (let index = 0; index < items.length; index += 3) {
    lines.push(`<span>${items.slice(index, index + 3).join(" · ")}</span>`);
  }

  return lines.join("");
}

function bindEvents() {
  document.getElementById("toggleSettings").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("is-collapsed");
  });

  document.getElementById("openDiningPage").addEventListener("click", () => {
    chrome.tabs.create({ url: DINING_URL });
  });

  document.getElementById("saveSettings").addEventListener("click", saveSettings);
  bindCategorySelectionRules();
}

function bindCategorySelectionRules() {
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

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  applySelectedCategories(settings.selectedNoticeCategories);
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
  await loadLatestNotices();
  document.getElementById("settingsPanel").classList.add("is-collapsed");
}

function normalizeSelectedCategories(categories) {
  if (!categories.length || categories.includes("전체")) {
    return ["전체"];
  }

  return categories;
}

async function loadLatestNotices() {
  try {
    const response = await fetch(NOTICE_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const rawNotices = parseKwNotices(html);
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
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
      publishedAt: extractNearbyDate(anchor) || "작성일 정보 없음"
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

function filterNoticesByCategory(notices, selectedCategories = ["전체"]) {
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
    const dateMatch = text.match(/\d{4}[.-]\d{2}[.-]\d{2}/);

    if (dateMatch) {
      return dateMatch[0];
    }
  }

  return "";
}

async function loadDiningMenus() {
  const today = getKoreaToday();
  const targetDate = formatDate(today);

  try {
    const response = await fetch(DINING_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const parsedMeals = parseDiningMenus(html, today);

    if (!parsedMeals.entries.length) {
      throw new Error("No dining menu parsed");
    }

    renderMealSection(parsedMeals);
    await chrome.storage.local.set({
      diningCache: {
        ...parsedMeals,
        targetDate
      }
    });
  } catch (error) {
    const { diningCache } = await chrome.storage.local.get("diningCache");

    if (diningCache?.entries?.length && diningCache.targetDate === targetDate) {
      renderMealSection(diningCache);
      return;
    }

    renderMealSection({
      ...SAMPLE_MEALS,
      focusLabel: "오늘 식단 확인 실패"
    });
  }
}

function parseDiningMenus(html, now) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const targetColumnIndex = getDiningColumnIndex(now);
  const table = findDiningTable(doc);

  if (!table || targetColumnIndex === -1) {
    return {
      date: formatDate(now),
      focusLabel: "운영 정보 없음",
      entries: [
        {
          name: "오늘 식단",
          time: "학식 페이지 확인",
          items: ["오늘 날짜에 해당하는 학식 정보가 없습니다."]
        }
      ]
    };
  }

  const rows = [...table.querySelectorAll("tr")];
  const dataRows = rows.slice(1);

  const entries = dataRows
    .map((row) => parseDiningRow(row, targetColumnIndex))
    .filter(Boolean);

  return {
    date: formatDate(now),
    focusLabel: pickMealLabel(now),
    entries
  };
}

function findDiningTable(doc) {
  const tables = [...doc.querySelectorAll("table")];
  return (
    tables.find((table) => {
      const text = table.textContent || "";
      return (
        text.includes("광운대 함지마루") &&
        text.includes("천원의 아침") &&
        text.includes("자율중식")
      );
    }) || null
  );
}

function parseDiningRow(row, targetColumnIndex) {
  const cells = [...row.querySelectorAll("th, td")];

  if (cells.length <= targetColumnIndex) {
    return null;
  }

  const infoCell = cells[0];
  const menuCell = cells[targetColumnIndex];
  const infoText = normalizeCellText(infoCell.innerText || infoCell.textContent || "");
  const menuLines = splitCellLines(menuCell.innerText || menuCell.textContent || "");

  if (!infoText || !menuLines.length) {
    return null;
  }

  return {
    name: parseDiningName(infoText),
    time: parseDiningTime(infoText),
    items: menuLines
  };
}

function normalizeCellText(value) {
  return value.replace(/\r/g, "").replace(/\n+/g, "\n").trim();
}

function splitCellLines(value) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDiningName(infoText) {
  const firstLine = infoText.split("\n")[0] || "";
  return firstLine
    .replace("광운대 함지마루", "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function parseDiningTime(infoText) {
  const match = infoText.match(/\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2}/);
  return match ? match[0] : "운영시간 미정";
}

function getDiningColumnIndex(now) {
  const weekday = getKoreaWeekday(now);

  if (weekday < 1 || weekday > 5) {
    return -1;
  }

  return weekday;
}

function pickMealLabel(now) {
  const koreaHour = getKoreaHour(now);

  if (koreaHour < 10) {
    return "오늘 아침";
  }

  if (koreaHour < 14) {
    return "오늘 점심";
  }

  return "오늘 식단";
}

function formatDate(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getKoreaToday() {
  return new Date();
}

function getKoreaHour(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false
  });

  return Number(formatter.format(date));
}

function getKoreaWeekday(date) {
  const weekdayText = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short"
  }).format(date);

  const map = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0
  };

  return map[weekdayText] ?? -1;
}
