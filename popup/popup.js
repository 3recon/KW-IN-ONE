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

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
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
    title: "설정 패널에서 필요한 카테고리만 선택할 수 있습니다.",
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
  breakfast: ["토스트", "스크램블 에그", "샐러드"],
  lunch: ["제육볶음", "된장국", "김치", "쌀밥"],
  dinner: ["돈까스", "우동", "단무지", "샐러드"]
};

document.addEventListener("DOMContentLoaded", async () => {
  renderQuickLinks();
  renderMealSection();
  renderPhonebook(window.KW_PHONEBOOK || []);
  renderCategoryOptions(window.KW_NOTICE_CATEGORIES || []);
  bindEvents();
  await loadSettings();
  await loadLatestNotices();

  const { lastRefreshAt } = await chrome.storage.local.get("lastRefreshAt");
  if (lastRefreshAt) {
    appendRefreshNotice(lastRefreshAt);
  }
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

function renderMealSection() {
  const { label, items } = getCurrentMeal();
  const labelNode = document.getElementById("mealLabel");
  const summaryNode = document.getElementById("mealSummary");

  labelNode.textContent = label;
  summaryNode.innerHTML = `
    <div class="meal-card">
      <strong>${label}</strong>
      <span>${items.join(" · ")}</span>
    </div>
    <div class="meal-card">
      <strong>오늘 전체 식단</strong>
      <span>아침 ${SAMPLE_MEALS.breakfast.join(", ")}</span><br>
      <span>점심 ${SAMPLE_MEALS.lunch.join(", ")}</span><br>
      <span>저녁 ${SAMPLE_MEALS.dinner.join(", ")}</span>
    </div>
  `;
}

function getCurrentMeal() {
  const hour = new Date().getHours();

  if (hour < 10) {
    return { label: "오늘 아침", items: SAMPLE_MEALS.breakfast };
  }

  if (hour < 15) {
    return { label: "오늘 점심", items: SAMPLE_MEALS.lunch };
  }

  return { label: "오늘 저녁", items: SAMPLE_MEALS.dinner };
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

function bindEvents() {
  document.getElementById("toggleSettings").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("is-collapsed");
  });

  document.getElementById("openDiningPage").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://www.kw.ac.kr/ko/life/facility11.jsp" });
  });

  document.getElementById("refreshNotices").addEventListener("click", async () => {
    const refreshedAt = new Date().toLocaleString("ko-KR");
    await chrome.storage.local.set({ lastRefreshAt: refreshedAt });
    await loadLatestNotices();
    appendRefreshNotice(refreshedAt);
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
  document.getElementById("notificationsEnabled").checked = settings.notificationsEnabled;
  document.getElementById("refreshMinutes").value = settings.refreshMinutes;
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
  const notificationsEnabled = document.getElementById("notificationsEnabled").checked;
  const refreshMinutes =
    Number(document.getElementById("refreshMinutes").value) || DEFAULT_SETTINGS.refreshMinutes;
  const selectedNoticeCategories = normalizeSelectedCategories(
    [...document.querySelectorAll('input[name="noticeCategory"]:checked')].map(
      (checkbox) => checkbox.value
    )
  );

  await chrome.storage.sync.set({
    notificationsEnabled,
    refreshMinutes,
    selectedNoticeCategories
  });

  document.getElementById("settingsStatus").textContent = "설정이 저장되었습니다.";
  await loadLatestNotices();
}

function normalizeSelectedCategories(categories) {
  if (!categories.length || categories.includes("전체")) {
    return ["전체"];
  }

  return categories;
}

function appendRefreshNotice(refreshedAt) {
  const list = document.getElementById("noticeList");
  const first = list.querySelector(".notice-item");

  if (!first) {
    return;
  }

  const existing = document.getElementById("refreshStamp");
  if (existing) {
    existing.textContent = `마지막 새로고침: ${refreshedAt}`;
    return;
  }

  const stamp = document.createElement("div");
  stamp.id = "refreshStamp";
  stamp.className = "notice-date";
  stamp.textContent = `마지막 새로고침: ${refreshedAt}`;
  first.appendChild(stamp);
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
