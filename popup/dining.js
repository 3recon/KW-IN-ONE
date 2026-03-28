import { DINING_URL, SAMPLE_MEALS } from "./constants.js";

export async function loadDiningMenus() {
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

export function renderMealSection(mealState) {
  const labelNode = document.getElementById("mealLabel");
  const summaryNode = document.getElementById("mealSummary");

  labelNode.textContent = mealState.focusLabel || "";
  labelNode.hidden = !mealState.focusLabel;
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

export function bindDiningOpen() {
  document.getElementById("openDiningPage").addEventListener("click", () => {
    chrome.tabs.create({ url: DINING_URL });
  });
}

function renderMealLines(items) {
  if (!items.length) {
    return "";
  }

  const lines = [];

  for (let index = 0; index < items.length; index += 3) {
    lines.push(`<span>${items.slice(index, index + 3).join(" · ")}</span>`);
  }

  return lines.join("");
}

function parseDiningMenus(html, now) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const targetColumnIndex = getDiningColumnIndex(now);
  const table = findDiningTable(doc);

  if (!table || targetColumnIndex === -1) {
    return {
      date: formatDate(now),
      focusLabel: "",
      entries: [
        {
          name: "오늘 식단",
          time: "학식 미운영",
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
