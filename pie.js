import { months } from "./months.js";
import { parseSpendItem } from "./utils.js";

const API_HOST = "http://localhost:3001/api/";
const CHANNEL_SLUG = "log-spending-new-s7t16f6dt8e";
const DISPLAY_YEAR = 2026;
const CATEGORY_COLORS = ["#e76f51", "#2a9d8f", "#e9c46a", "#457b9d"];

const tagButtons = document.querySelector("#tag-buttons");
const categoryBoxes = document.querySelector("#category-boxes");
const monthsView = document.querySelector("#months");

let items = [];
let activeCategory = 0;
const categories = Array.from({ length: 4 }, () => []);

const makeElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const cleanTag = (tag) => tag.trim();

const itemTags = (item) => (item.tags || []).map(cleanTag).filter(Boolean);

const formatAmount = (amount) => amount.toFixed(2).replace(/\.00$/, "");

const tagOwner = (tag) => categories.findIndex((category) => category.includes(tag));

function renderCategories() {
  categoryBoxes.replaceChildren();

  categories.forEach((category, index) => {
    const box = makeElement("button", "category-box");
    box.type = "button";
    box.style.setProperty("--category-color", CATEGORY_COLORS[index]);
    box.classList.toggle("active", index === activeCategory);
    box.setAttribute("aria-pressed", index === activeCategory ? "true" : "false");
    box.addEventListener("click", () => {
      activeCategory = index;
      renderControls();
    });

    box.appendChild(makeElement("span", "category-name", `Category ${index + 1}`));
    const tags = makeElement("span", "category-tags");
    if (category.length === 0) {
      tags.appendChild(makeElement("span", "", "empty"));
    } else {
      category.forEach((tag) => tags.appendChild(makeElement("span", "", tag)));
    }
    box.appendChild(tags);
    categoryBoxes.appendChild(box);
  });
}

function renderTags() {
  tagButtons.replaceChildren();
  const tags = [...new Set(
    items
      .filter((item) => item.Date.getUTCFullYear() === DISPLAY_YEAR)
      .flatMap(itemTags)
  )].sort((a, b) => a.localeCompare(b));

  if (tags.length === 0) {
    tagButtons.appendChild(makeElement("span", "empty-month", "No tags found"));
    return;
  }

  tags.forEach((tag) => {
    const button = makeElement("button", "tag-button", tag);
    button.type = "button";
    const owner = tagOwner(tag);
    if (owner !== -1) {
      button.classList.add("assigned");
      button.style.setProperty("--category-color", CATEGORY_COLORS[owner]);
      button.title = `Assigned to Category ${owner + 1}`;
    } else {
      button.title = `Add to Category ${activeCategory + 1}`;
    }

    button.addEventListener("click", () => {
      const currentCategory = categories[activeCategory];
      const currentIndex = currentCategory.indexOf(tag);

      if (currentIndex !== -1) {
        currentCategory.splice(currentIndex, 1);
      } else {
        // A tag belongs to one category at a time. Clicking it in a new
        // selected box moves it from its previous box.
        categories.forEach((category) => {
          const index = category.indexOf(tag);
          if (index !== -1) category.splice(index, 1);
        });
        currentCategory.push(tag);
      }

      renderControls();
      renderMonths();
    });
    tagButtons.appendChild(button);
  });
}

function renderControls() {
  renderTags();
  renderCategories();
}

function amountForItem(item) {
  const amount = Number.parseFloat(item.price);
  // Pie slices cannot represent negative values. Positive prices are
  // spending entries; earnings are left out of the spending charts.
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function slicesForMonth(monthNumber) {
  const totals = categories.map(() => 0);
  const monthItems = items.filter((item) => {
    return item.Date.getUTCFullYear() === DISPLAY_YEAR && item.Date.getUTCMonth() === monthNumber;
  });

  monthItems.forEach((item) => {
    const tags = itemTags(item);
    const categoryIndex = categories.findIndex((category) => {
      return category.length > 0 && tags.some((tag) => category.includes(tag));
    });

    if (categoryIndex !== -1) totals[categoryIndex] += amountForItem(item);
  });

  return totals
    .map((amount, index) => ({
      amount,
      index,
      label: `Category ${index + 1}`,
      color: CATEGORY_COLORS[index],
    }))
    .filter((slice) => slice.amount > 0);
}

function renderMonths() {
  monthsView.replaceChildren();

  months.forEach((month, monthNumber) => {
    const monthView = makeElement("article", "month");
    monthView.appendChild(makeElement("h2", "", month));

    const slices = slicesForMonth(monthNumber);
    const chart = makeElement("div", "chart");
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", `${month} spending pie chart`);

    if (slices.length === 0) {
      chart.style.background = "var(--chart-background)";
      chart.appendChild(makeElement("span", "chart-total", "—"));
      monthView.appendChild(chart);
      monthView.appendChild(makeElement("p", "empty-month", "No assigned spending"));
      monthsView.appendChild(monthView);
      return;
    }

    const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
    let start = 0;
    const stops = slices.map((slice) => {
      const end = start + (slice.amount / total) * 100;
      const stop = `${slice.color} ${start}% ${end}%`;
      start = end;
      return stop;
    });
    chart.style.background = `conic-gradient(${stops.join(", ")})`;
    chart.appendChild(makeElement("span", "chart-total", formatAmount(total)));
    monthView.appendChild(chart);

    const legend = makeElement("ul", "legend");
    slices.forEach((slice) => {
      const entry = makeElement("li");
      const color = makeElement("span", "legend-color");
      color.style.setProperty("--legend-color", slice.color);
      entry.appendChild(color);
      entry.appendChild(makeElement("span", "", `${slice.label}: ${formatAmount(slice.amount)}`));
      legend.appendChild(entry);
    });
    monthView.appendChild(legend);
    monthsView.appendChild(monthView);
  });
}

async function loadItems() {
  const response = await fetch(`${API_HOST}channels/${CHANNEL_SLUG}/contents?per=150&force=true`);
  if (!response.ok) throw new Error(`Could not load spending entries (${response.status})`);

  const payload = await response.json();
  const blocks = payload.data || payload;
  if (!Array.isArray(blocks)) return [];

  return blocks.flatMap((block) => {
    try {
      const parsed = parseSpendItem(block);
      return (Array.isArray(parsed) ? parsed : [parsed])
        .filter(Boolean)
        .map((item) => ({
          ...item,
          Date: new Date(item.date),
        }))
        .filter((item) => !Number.isNaN(item.Date.getTime()));
    } catch (error) {
      console.warn("Could not parse spending block", block, error);
      return [];
    }
  });
}

async function init() {
  monthsView.appendChild(makeElement("p", "status", "Loading spending…"));
  try {
    items = await loadItems();
    renderControls();
    renderMonths();
  } catch (error) {
    console.error(error);
    monthsView.replaceChildren(makeElement("p", "status", "Could not load spending data."));
  }
}

init();
