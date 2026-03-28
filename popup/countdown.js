const COUNTDOWN_STORAGE_KEY = "examCountdown";

let countdownTimerId = null;

export async function initializeCountdown() {
  bindCountdownEvents();
  await loadCountdown();
}

function bindCountdownEvents() {
  document.getElementById("toggleCountdownSettings").addEventListener("click", () => {
    document.getElementById("countdownSettings").classList.toggle("is-collapsed");
  });

  document.getElementById("saveCountdown").addEventListener("click", saveCountdown);
}

async function loadCountdown() {
  const stored = await chrome.storage.sync.get(COUNTDOWN_STORAGE_KEY);
  const countdown = stored[COUNTDOWN_STORAGE_KEY];

  if (!countdown) {
    renderCountdownEmpty();
    return;
  }

  document.getElementById("countdownLabelInput").value = countdown.label || "";
  document.getElementById("countdownDateTimeInput").value = countdown.targetDateTime || "";
  startCountdown(countdown);
}

async function saveCountdown() {
  const label = document.getElementById("countdownLabelInput").value.trim();
  const targetDateTime = document.getElementById("countdownDateTimeInput").value;

  if (!label || !targetDateTime) {
    document.getElementById("countdownStatus").textContent = "일정명과 날짜/시간을 모두 입력해주세요.";
    return;
  }

  const countdown = { label, targetDateTime };

  await chrome.storage.sync.set({
    [COUNTDOWN_STORAGE_KEY]: countdown
  });

  document.getElementById("countdownStatus").textContent = "시험 일정이 저장되었습니다.";
  startCountdown(countdown);
  document.getElementById("countdownSettings").classList.add("is-collapsed");
}

function startCountdown(countdown) {
  if (countdownTimerId) {
    clearInterval(countdownTimerId);
  }

  updateCountdown(countdown);
  countdownTimerId = setInterval(() => updateCountdown(countdown), 1000);
}

function updateCountdown(countdown) {
  const now = new Date();
  const target = new Date(countdown.targetDateTime);
  const diff = target.getTime() - now.getTime();

  if (Number.isNaN(target.getTime())) {
    renderCountdownMessage("잘못된 날짜 형식입니다.");
    return;
  }

  if (diff <= 0) {
    renderCountdownMessage(`[${countdown.label}] 일정이 시작되었습니다.`);
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  renderCountdownMessage(
    `[${countdown.label}] 시작까지 ${days}일 ${hours}시간 ${minutes}분 ${seconds}초`
  );
}

function renderCountdownEmpty() {
  renderCountdownMessage("시험 일정을 등록하면 남은 시간을 표시합니다.");
}

function renderCountdownMessage(message) {
  document.getElementById("countdownDisplay").textContent = message;
}
