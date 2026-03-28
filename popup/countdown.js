const COUNTDOWN_STORAGE_KEY = "examCountdowns";
const LEGACY_COUNTDOWN_STORAGE_KEY = "examCountdown";

let countdownTimerId = null;
let editingCountdownId = null;
let calendarCursorDate = new Date();
let calendarSelectedDate = new Date();

export async function initializeCountdown() {
  bindCountdownEvents();
  initializeCalendarControls();
  await migrateLegacyCountdown();
  await loadCountdowns();
}

function bindCountdownEvents() {
  document.getElementById("toggleCountdownSettings").addEventListener("click", () => {
    document.getElementById("countdownSettings").classList.toggle("is-collapsed");
  });

  document.getElementById("saveCountdown").addEventListener("click", saveCountdown);
  document.getElementById("cancelCountdown").addEventListener("click", cancelCountdownEditing);
  document.getElementById("countdownList").addEventListener("click", handleCountdownListClick);
  document.getElementById("openCalendarModal").addEventListener("click", openCalendarModal);
  document.getElementById("calendarBackdrop").addEventListener("click", closeCalendarModal);
  document.getElementById("closeCalendar").addEventListener("click", closeCalendarModal);
  document.getElementById("prevMonth").addEventListener("click", () => moveCalendarMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => moveCalendarMonth(1));
  document.getElementById("confirmCalendar").addEventListener("click", confirmCalendarSelection);
}

function initializeCalendarControls() {
  const hourSelect = document.getElementById("calendarHour");
  const minuteSelect = document.getElementById("calendarMinute");

  hourSelect.innerHTML = Array.from({ length: 24 }, (_, hour) => {
    const value = String(hour).padStart(2, "0");
    return `<option value="${value}">${value}</option>`;
  }).join("");

  minuteSelect.innerHTML = Array.from({ length: 60 }, (_, minute) => {
    const value = String(minute).padStart(2, "0");
    return `<option value="${value}">${value}</option>`;
  }).join("");

  syncCalendarInputs(new Date());
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

  if (!countdowns.length) {
    stopCountdownTimer();
    renderCountdownList([]);
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
    ? "일정이 수정되었습니다."
    : "일정이 저장되었습니다.";

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
    document.getElementById("openCalendarModal").textContent = formatCalendarButtonText(
      selected.targetDateTime
    );
    syncCalendarInputs(new Date(selected.targetDateTime));
    document.getElementById("countdownStatus").textContent = "수정할 일정을 편집 중입니다.";
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
      renderCountdownList([]);
      return;
    }

    startCountdown(nextCountdowns);
  }
}

function openCalendarModal() {
  const currentValue = document.getElementById("countdownDateTimeInput").value;
  const baseDate = currentValue ? new Date(currentValue) : new Date();
  syncCalendarInputs(baseDate);
  document.getElementById("calendarModal").classList.remove("is-collapsed");
}

function closeCalendarModal() {
  document.getElementById("calendarModal").classList.add("is-collapsed");
}

function moveCalendarMonth(offset) {
  calendarCursorDate = new Date(
    calendarCursorDate.getFullYear(),
    calendarCursorDate.getMonth() + offset,
    1
  );
  renderCalendar();
}

function confirmCalendarSelection() {
  const hour = document.getElementById("calendarHour").value;
  const minute = document.getElementById("calendarMinute").value;
  const selected = new Date(
    calendarSelectedDate.getFullYear(),
    calendarSelectedDate.getMonth(),
    calendarSelectedDate.getDate(),
    Number(hour),
    Number(minute)
  );
  const isoValue = formatDateTimeLocalValue(selected);

  document.getElementById("countdownDateTimeInput").value = isoValue;
  document.getElementById("openCalendarModal").textContent = formatCalendarButtonText(isoValue);
  closeCalendarModal();
}

function syncCalendarInputs(date) {
  calendarSelectedDate = new Date(date);
  calendarCursorDate = new Date(date.getFullYear(), date.getMonth(), 1);
  document.getElementById("calendarHour").value = String(date.getHours()).padStart(2, "0");
  document.getElementById("calendarMinute").value = String(date.getMinutes()).padStart(2, "0");
  renderCalendar();
}

function renderCalendar() {
  const year = calendarCursorDate.getFullYear();
  const month = calendarCursorDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const title = `${year}.${String(month + 1).padStart(2, "0")}`;

  document.getElementById("calendarTitle").textContent = title;

  const cells = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    cells.push(createDayButton(prevMonthDays - index, true, year, month - 1));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(createDayButton(day, false, year, month));
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - (firstDay + daysInMonth) + 1;
    cells.push(createDayButton(day, true, year, month + 1));
  }

  document.getElementById("calendarGrid").innerHTML = cells.join("");
  document.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      calendarSelectedDate = new Date(
        Number(button.dataset.year),
        Number(button.dataset.month),
        Number(button.dataset.day)
      );
      calendarCursorDate = new Date(calendarSelectedDate.getFullYear(), calendarSelectedDate.getMonth(), 1);
      renderCalendar();
    });
  });
}

function createDayButton(day, isMuted, year, month) {
  const normalizedDate = new Date(year, month, day);
  const isSelected =
    normalizedDate.getFullYear() === calendarSelectedDate.getFullYear() &&
    normalizedDate.getMonth() === calendarSelectedDate.getMonth() &&
    normalizedDate.getDate() === calendarSelectedDate.getDate();

  return `
    <button
      class="calendar-day${isMuted ? " is-muted" : ""}${isSelected ? " is-selected" : ""}"
      type="button"
      data-year="${normalizedDate.getFullYear()}"
      data-month="${normalizedDate.getMonth()}"
      data-day="${normalizedDate.getDate()}"
    >
      ${normalizedDate.getDate()}
    </button>
  `;
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
  renderCountdownList(countdowns, now);
}

function renderCountdownList(countdowns, now = new Date()) {
  const container = document.getElementById("countdownList");

  if (!countdowns.length) {
    container.innerHTML =
      '<div class="countdown-item-remaining">일정을 등록하면 남은 시간을 표시합니다.</div>';
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
            <div class="countdown-item-top">
              <span class="countdown-item-remaining">${formatRemainingText(countdown, now)}</span>
              <div class="countdown-item-actions">
                <button class="ghost-button countdown-action-button" type="button" data-action="edit" data-id="${countdown.id}">수정</button>
                <button class="ghost-button countdown-action-button" type="button" data-action="delete" data-id="${countdown.id}">삭제</button>
              </div>
            </div>
            <span class="countdown-item-date">${formatDateTime(countdown.targetDateTime)}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function resetCountdownForm() {
  editingCountdownId = null;
  document.getElementById("countdownLabelInput").value = "";
  document.getElementById("countdownDateTimeInput").value = "";
  document.getElementById("openCalendarModal").textContent = "날짜와 시간을 선택하세요";
  document.getElementById("countdownStatus").textContent = "";
  syncCalendarInputs(new Date());
}

function cancelCountdownEditing() {
  resetCountdownForm();
  document.getElementById("countdownSettings").classList.add("is-collapsed");
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

function formatRemainingText(countdown, now) {
  const target = new Date(countdown.targetDateTime);
  const diff = target.getTime() - now.getTime();

  if (Number.isNaN(target.getTime())) {
    return "잘못된 날짜 형식입니다.";
  }

  if (diff <= 0) {
    return `${countdown.label} 일정이 시작되었습니다.`;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${countdown.label}까지 ${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
}

function formatDateTimeLocalValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatCalendarButtonText(value) {
  return formatDateTime(value);
}
