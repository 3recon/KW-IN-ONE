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

const SAMPLE_NOTICES = [
  {
    source: "광운대 홈페이지",
    title: "공지 수집 어댑터 연결 전까지는 예시 공지가 표시됩니다.",
    url: NOTICE_URL,
    publishedAt: "오늘"
  },
  {
    source: "KLAS",
    title: "로그인 의존도가 있는 공지 수집은 다음 단계에서 검토합니다.",
    url: "https://klas.kw.ac.kr/",
    publishedAt: "MVP 설계"
  },
  {
    source: "학생 생활",
    title: "학식과 전화번호부는 팝업에서 빠르게 접근할 수 있게 구성했습니다.",
    url: "https://www.kw.ac.kr/ko/life/facility11.jsp",
    publishedAt: "초기 버전"
  }
];

const SAMPLE_MEALS = {
  breakfast: ["토스트", "스크램블 에그", "샐러드"],
  lunch: ["제육볶음", "된장국", "김치", "쌀밥"],
  dinner: ["돈까스", "우동", "단무지", "샐러드"]
};

document.addEventListener("DOMContentLoaded", async () => {
  renderQuickLinks();
  renderNotices([
    {
      source: "광운대 공지",
      title: "공지사항을 불러오는 중입니다.",
      url: NOTICE_URL,
      publishedAt: ""
    }
  ]);
  renderMealSection();
  renderPhonebook(window.KW_PHONEBOOK || []);
  bindEvents();
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
    anchor.innerHTML = `
      <span class="link-title">${link.title}</span>
    `;
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
      <span class="notice-source">${notice.source}</span>
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

  const initialCategory = categories[0];
  drawPhoneList(entries, initialCategory);

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

function bindEvents() {
  document.getElementById("openDiningPage").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://www.kw.ac.kr/ko/life/facility11.jsp" });
  });

  document.getElementById("refreshNotices").addEventListener("click", async () => {
    const refreshedAt = new Date().toLocaleString("ko-KR");
    await chrome.storage.local.set({ lastRefreshAt: refreshedAt });
    await loadLatestNotices();
    appendRefreshNotice(refreshedAt);
  });
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
    const notices = parseKwNotices(html);

    if (!notices.length) {
      throw new Error("No notices parsed");
    }

    renderNotices(notices.slice(0, 3));
    await chrome.storage.local.set({ latestNotices: notices.slice(0, 3) });
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
    const title = normalizeNoticeTitle(anchor.textContent || "");

    if (!href || !title || seen.has(href)) {
      continue;
    }

    const metaText = extractNearbyMeta(anchor);

    notices.push({
      source: "광운대 공지",
      title,
      url: new URL(href, NOTICE_URL).toString(),
      publishedAt: metaText || "작성일 정보 없음"
    });

    seen.add(href);

    if (notices.length === 3) {
      break;
    }
  }

  return notices;
}

function normalizeNoticeTitle(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/신규게시글/g, "")
    .replace(/Attachment/g, "")
    .trim();
}

function extractNearbyMeta(anchor) {
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
