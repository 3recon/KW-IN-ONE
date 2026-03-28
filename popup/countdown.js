const COUNTDOWN_STORAGE_KEY = "examCountdowns";
const LEGACY_COUNTDOWN_STORAGE_KEY = "examCountdown";

let countdownTimerId = null;
let editingCountdownId = null;

export async function initializeCountdown() {
  bindCountdownEvents();
  await migrateLegacyCountdown();
  await loadCountdowns();
}

function bindCountdownEvents() {
  document.getElementById("toggleCountdownSettings").addEventListener("click", () => {
    document.getElementById("countdownSettings").classList.toggle("is-collapsed");
  });

  document.getElementById("saveCountdown").addEventListener("click", saveCountdown);
  document.getElementById("countdownList").addEventListener("click", handleCountdownListClick);
}

async function migrateLegacyCountdown() {
  const stored = await chrome.storage.sync.get([
    COUNTDOWN_STORAGE_KEY,
    LEGACY_COUNTDOWN_STORAGE_KEY
  ]);

  if (stored[COUNTDOWN_STORAGE_KEY]?.length || !stored[LEGACY_COUNTDOWN_STORAGE_KEY]) {
    return;
  }

  const legacy = stored[LEGACY_COUNTDOWN_STORAGE_KEY];
  const migrated = [
    {
      id: createCountdownId(),
      label: legacy.label,
      targetDateTime: legacy.targetDateTime
    }
  ];

  await chrome.storage.sync.set({
    [COUNTDOWN_STORAGE_KEY]: migrated
  });
}

async function loadCountdowns() {
  const stored = await chrome.storage.sync.get(COUNTDOWN_STORAGE_KEY);
  const countdowns = stored[COUNTDOWN_STORAGE_KEY] || [];

  renderCountdownList(countdowns);

  if (!countdowns.length) {
    stopCountdownTimer();
    renderCountdownMessage("시험 일정을 등록하면 남은 시간을 표시합니다.");
    return;
  }

  startCountdown(countdowns);
}

async function saveCountdown() {
  const label = document.getElementById("countdownLabelInput").value.trim();
  const targetDateTime = document.getElementById("countdownDateTimeInput").value;

  if (!label || !targetDateTime) {
    document.getElementById("countdownStatus").textContent =
      "일정명과 날짜/시간을 모두 입력해주세요.";
    return;
  }

  const countdowns = await getStoredCountdowns();
  const nextCountdowns = editingCountdownId
    ? countdowns.map((countdown) =>
        countdown.id === editingCountdownId
          ? { ...countdown, label, targetDateTime }
          : countdown
      )
    : [
        ...countdowns,
        {
          id: createCountdownId(),
          label,
          targetDateTime
        }
      ];

  await chrome.storage.sync.set({
    [COUNTDOWN_STORAGE_KEY]: nextCountdowns
  });

  document.getElementById("countdownStatus").textContent = editingCountdownId
    ? "시험 일정이 수정되었습니다."
    : "시험 일정이 저장되었습니다.";

  resetCountdownForm();
  renderCountdownList(nextCountdowns);
  startCountdown(nextCountdowns);
  document.getElementById("countdownSettings").classList.add("is-collapsed");
}

async function handleCountdownListClick(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const countdownId = actionButton.dataset.id;
  const action = actionButton.dataset.action;
  const countdowns = await getStoredCountdowns();
  const selected = countdowns.find((countdown) => countdown.id === countdownId);

  if (!selected) {
    return;
  }

  if (action === "edit") {
    editingCountdownId = selected.id;
    document.getElementById("countdownLabelInput").value = selected.label;
    document.getElementById("countdownDateTimeInput").value = selected.targetDateTime;
    document.getElementById("countdownStatus").textContent = "수정할 시험 일정을 편집 중입니다.";
    document.getElementById("countdownSettings").classList.remove("is-collapsed");
    return;
  }

  if (action === "delete") {
    const nextCountdowns = countdowns.filter((countdown) => countdown.id !== countdownId);
    await chrome.storage.sync.set({
      [COUNTDOWN_STORAGE_KEY]: nextCountdowns
    });

    if (editingCountdownId === countdownId) {
      resetCountdownForm();
    }

    renderCountdownList(nextCountdowns);

    if (!nextCountdowns.length) {
      stopCountdownTimer();
      renderCountdownMessage("시험 일정을 등록하면 남은 시간을 표시합니다.");
      return;
    }

    startCountdown(nextCountdowns);
  }
}

function startCountdown(countdowns) {
  stopCountdownTimer();
  updateCountdown(countdowns);
  countdownTimerId = setInterval(() => updateCountdown(countdowns), 1000);
}

function stopCountdownTimer() {
  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
}

function updateCountdown(countdowns) {
  const now = new Date();
  const nearest = findNearestUpcomingCountdown(countdowns, now);

  if (!nearest) {
    renderCountdownMessage("등록된 시험 일정이 모두 시작되었습니다.");
    return;
  }

  const target = new Date(nearest.targetDateTime);
  const diff = target.getTime() - now.getTime();

  if (Number.isNaN(target.getTime())) {
    renderCountdownMessage("잘못된 날짜 형식입니다.");
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  renderCountdownMessage(
    `${nearest.label}까지 ${days}일 ${hours}시간 ${minutes}분 ${seconds}초`
  );
}

function renderCountdownList(countdowns) {
  const container = document.getElementById("countdownList");

  if (!countdowns.length) {
    container.innerHTML = "";
    return;
  }

  const sorted = [...countdowns].sort(
    (left, right) => new Date(left.targetDateTime).getTime() - new Date(right.targetDateTime).getTime()
  );

  container.innerHTML = sorted
    .map(
      (countdown) => `
        <div class="countdown-item">
          <div class="countdown-item-main">
            <strong>${countdown.label}</strong>
            <span class="countdown-item-date">${formatDateTime(countdown.targetDateTime)}</span>
          </div>
          <div class="countdown-item-actions">
            <button class="ghost-button" type="button" data-action="edit" data-id="${countdown.id}">수정</button>
            <button class="ghost-button" type="button" data-action="delete" data-id="${countdown.id}">삭제</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderCountdownMessage(message) {
  document.getElementById("countdownDisplay").textContent = message;
}

function resetCountdownForm() {
  editingCountdownId = null;
  document.getElementById("countdownLabelInput").value = "";
  document.getElementById("countdownDateTimeInput").value = "";
}

function findNearestUpcomingCountdown(countdowns, now) {
  return countdowns
    .filter((countdown) => new Date(countdown.targetDateTime).getTime() > now.getTime())
    .sort(
      (left, right) =>
        new Date(left.targetDateTime).getTime() - new Date(right.targetDateTime).getTime()
    )[0];
}

async function getStoredCountdowns() {
  const stored = await chrome.storage.sync.get(COUNTDOWN_STORAGE_KEY);
  return stored[COUNTDOWN_STORAGE_KEY] || [];
}

function createCountdownId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "날짜 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
