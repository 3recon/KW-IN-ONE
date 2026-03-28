export function renderPhonebook(entries) {
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
