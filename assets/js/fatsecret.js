// assets/js/fatsecret.js
console.log("fatsecret.js loaded");

// Our Fly.io proxy endpoint
const WORKER_URL = "https://fatsecret-backend.fly.dev/fatsecret";

export async function searchFoodFatsecret(query) {
  if (!query || !query.trim()) {
    console.warn("searchFoodFatsecret called with empty query");
    return null;
  }

  console.log("Sending query to FatSecret:", query);

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "foods.search",
        params: {
          search_expression: query,
          max_results: 10,
        },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Proxy HTTP error:", res.status, txt);
      return { error: "Proxy HTTP error " + res.status };
    }

    const data = await res.json();
    console.log("Raw FatSecret response:", data);
    return data;
  } catch (err) {
    console.error("FatSecret search error:", err);
    return { error: "Unexpected error while fetching FatSecret data" };
  }
}
