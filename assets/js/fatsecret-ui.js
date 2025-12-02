console.log("fatsecret-ui.js loaded");

// Import the function that actually calls Firebase → FatSecret
import { searchFoodFatsecret } from "/assets/js/fatsecret.js";



// Pull just the number after a label like "Calories:", "Fat:", etc.
function extractNumber(desc, label) {
  const regex = new RegExp(`${label}:\\s*([0-9.]+)`, "i");
  const match = desc.match(regex);
  return match ? match[1] : "";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("fatsecret-ui DOM ready");

  const input      = document.getElementById("fatsecret-input");
  const button     = document.getElementById("fatsecret-btn");
  const resultsDiv = document.getElementById("fatsecret-results");

  // diary macro inputs
  const calInput   = document.getElementById("diary-calories");
  const protInput  = document.getElementById("diary-protein");
  const carbsInput = document.getElementById("diary-carbs");
  const fatInput   = document.getElementById("diary-fat");

  if (!input || !button || !resultsDiv) {
    console.error("FatSecret UI: missing search elements.");
    return;
  }

  async function handleSearchClick() {
    const query = input.value.trim();
    console.log("Sending query to FatSecret:", query);

    if (!query) {
      resultsDiv.textContent = "Please enter a food name.";
      return;
    }

    resultsDiv.textContent = "Searching...";

    try {
      const res = await searchFoodFatsecret(query);
      console.log("Raw FatSecret response:", res);

      resultsDiv.innerHTML = "";

      if (!res || !res.ok || !res.data) {
        resultsDiv.textContent = "No data from FatSecret.";
        return;
      }

      if (res.data.error) {
        const err = res.data.error;
        const msg =
          err.message || err.error_description || JSON.stringify(err);
        console.error("FatSecret reported an error:", err);
        resultsDiv.textContent = "FatSecret error: " + msg;
        return;
      }

      const foods = res.data.foods?.food || [];
      if (!foods.length) {
        resultsDiv.textContent = "No results found.";
        return;
      }

      foods.forEach((food) => {
        const descText = food.food_description || "";

        // Split into serving + macro text
        let serving = descText;
        let macroPart = "";
        const splitIdx = descText.indexOf(" - ");
        if (splitIdx !== -1) {
          serving = descText.slice(0, splitIdx);    // "Per 100g"
          macroPart = descText.slice(splitIdx + 3); // "Calories: ... | Fat: ..."
        }

        // Parse macros from description
        const calories = extractNumber(descText, "Calories");
        const fat      = extractNumber(descText, "Fat");
        const carbs    = extractNumber(descText, "Carbs");
        const protein  = extractNumber(descText, "Protein");

        // Build UI card
        const card = document.createElement("div");
        card.classList.add("fatsecret-card");

        const nameEl = document.createElement("div");
        nameEl.classList.add("fatsecret-name");
        nameEl.textContent = food.food_name;

        const servingEl = document.createElement("div");
        servingEl.classList.add("fatsecret-serving");
        servingEl.textContent = serving;

        const macrosEl = document.createElement("div");
        macrosEl.classList.add("fatsecret-macros");
        macrosEl.textContent = macroPart || descText;

        card.appendChild(nameEl);
        card.appendChild(servingEl);
        card.appendChild(macrosEl);
        resultsDiv.appendChild(card);

        // HOVER → fill diary macros for this meal
        const fillFields = () => {
          if (calInput)   calInput.value   = calories || "";
          if (protInput)  protInput.value  = protein  || "";
          if (carbsInput) carbsInput.value = carbs    || "";
          if (fatInput)   fatInput.value   = fat      || "";
        };

        card.addEventListener("mouseenter", fillFields);
        // If you prefer click instead of hover, replace with:
        // card.addEventListener("click", fillFields);
      });
    } catch (err) {
      console.error("FatSecret search error:", err);
      resultsDiv.textContent = "Error searching FatSecret. Check console.";
    }
  }

  button.addEventListener("click", handleSearchClick);
});
