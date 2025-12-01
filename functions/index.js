const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Test function (keep this!)
exports.helloTest = functions.https.onCall((data, context) => {
  return { message: "hello from firebase" };
});

// FatSecret Search API
exports.fatsecretSearch = functions.https.onCall(async (data, context) => {
  try {
    const query = data.query;

    if (!query || typeof query !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing or invalid 'query' parameter"
      );
    }

    // Pull your API keys from functions:config
    const config = functions.config();
    const clientId = config.fatsecret.client_id;
    const clientSecret = config.fatsecret.client_secret;

    // 1. Get OAuth2 token
    const tokenResponse = await fetch(
      "https://oauth.fatsecret.com/connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          scope: "basic",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      console.error("FatSecret token error:", text);
      throw new functions.https.HttpsError(
        "unknown",
        "Failed to obtain FatSecret OAuth token"
      );
    }

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;

    // 2. Call FatSecret foods.search
    const url = new URL(
      "https://platform.fatsecret.com/rest/foods.search/v1"
    );
    url.searchParams.set("search_expression", query);
    url.searchParams.set("max_results", "10");
    url.searchParams.set("format", "json");

    const apiResponse = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!apiResponse.ok) {
      const text = await apiResponse.text();
      console.error("FatSecret API error:", text);
      throw new functions.https.HttpsError(
        "unknown",
        "FatSecret search request failed"
      );
    }

    const apiData = await apiResponse.json();

    return {
      ok: true,
      data: apiData,
    };

  } catch (err) {
    console.error("FatSecret Function Error:", err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError("unknown", "Unexpected server error");
  }
});
