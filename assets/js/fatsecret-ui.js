console.log("fatsecret-ui.js loaded");

// Import the function that actually calls Firebase → FatSecret
import { searchFoodFatsecret } from "/assets/js/fatsecret.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("fatsecret-ui DOM ready");

  const input = document.getElementById("fatsecret-input");
  const btn = document.getElementById("fatsecret-btn");
  const resultsDiv = document.getElementById("fatsecret-results");

  if (!input || !btn || !resultsDiv) {
    console.error("FatSecret UI: Missing required elements.");
    return;
  }

  btn.addEventListener("click", handleSearchClick);

  async function handleSearchClick() {
    const query = input.value.trim();
    console.log("Sending query to FatSecret:", query);

    if (!query) {
      resultsDiv.textContent = "Please enter a food name.";
      return;
    }

    try {
      // Call the backend
      const res = await searchFoodFatsecret(query);
      console.log("Raw FatSecret response:", res);

      resultsDiv.innerHTML = ""; // clear old results

      // Safety check
      if (!res || !res.ok || !res.data) {
        resultsDiv.textContent = "No data received from FatSecret.";
        return;
      }

      // Check for FatSecret-side error
      if (res.data.error) {
        console.error("FatSecret reported an error:", res.data.error);

        let msg =
          res.data.error.message ||
          res.data.error.error_description ||
          JSON.stringify(res.data.error);

        resultsDiv.textContent = "FatSecret error: " + msg;
        return;
      }

      // Normal success case – extract foods
      const foods = res.data.foods?.food || [];
      console.log("Parsed foods:", foods);

      if (foods.length === 0) {
        resultsDiv.textContent = "No results found.";
        return;
      }

      // Render the foods
      const ul = document.createElement("ul");
      foods.forEach((food) => {
        const li = document.createElement("li");
        li.textContent = `${food.food_name} — ${food.food_description}`;
        ul.appendChild(li);
      });

      resultsDiv.appendChild(ul);
    } catch (err) {
      console.error("FatSecret search error:", err);
      resultsDiv.textContent = "Error searching FatSecret. Check console.";
    }
  }
});
