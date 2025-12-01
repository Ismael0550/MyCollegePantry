import { searchFoodFatsecret } from "./fatsecret.js";

console.log("fatsecret-ui.js loaded");

const input = document.getElementById("fatsecretSearchInput");
const button = document.getElementById("fatsecretSearchButton");
const resultsDiv = document.getElementById("fatsecretResults");

async function handleSearchClick() {
  const query = input.value.trim();
  console.log("Sending query to FatSecret:", query);

  if (!query) {
    resultsDiv.textContent = "Type something first.";
    return;
  }

  resultsDiv.textContent = "Searching...";

  try {
    // 🔥 FIXED — pass a STRING, not an object
    const res = await searchFoodFatsecret(query);
    console.log("Raw FatSecret response:", res);

    if (!res || !res.ok || !res.data) {
      resultsDiv.textContent = "No data from FatSecret.";
      return;
    }

    // FatSecret returns data.foods.food (array)
    const foods = res.data.foods?.food || [];

    if (!foods.length) {
      resultsDiv.textContent = "No results found.";
      return;
    }

    // Basic list rendering
    resultsDiv.innerHTML = `
      <ul>
        ${foods
          .map((food) => {
            const name = food.food_name || "Unknown food";
            const desc = food.food_description || "";
            return `
              <li>
                <strong>${name}</strong><br>
                <small>${desc}</small>
              </li>
            `;
          })
          .join("")}
      </ul>
    `;
  } catch (err) {
    console.error("FatSecret search error:", err);
    resultsDiv.textContent = "Error searching FatSecret. Check console.";
  }
}

if (button && input) {
  button.addEventListener("click", handleSearchClick);
}
