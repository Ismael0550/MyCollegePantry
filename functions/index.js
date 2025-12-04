// functions/index.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const OpenAI = require("openai");

// Initializing Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Simple test function
exports.helloTest = onCall((request) => {
  return { message: "hello from firebase" };
});

// Define secrets (backed by Secret Manager)
const FATSECRET_CLIENT_ID = defineSecret("FATSECRET_CLIENT_ID");
const FATSECRET_CLIENT_SECRET = defineSecret("FATSECRET_CLIENT_SECRET");
const OPEN_AI_KEY = defineSecret("OPENAI_API_KEY");

// FatSecret search function
exports.fatsecretSearch = onCall(
  {
    secrets: [FATSECRET_CLIENT_ID, FATSECRET_CLIENT_SECRET],
  },
  async (request) => {
    try {
      const data = request.data;
      console.log(
        "fatsecretSearch incoming data:",
        JSON.stringify(data),
        "typeof data:",
        typeof data
      );

      // accept either "fn('chicken')" or "fn({ query: 'chicken' })"
      let query;
      if (typeof data === "string") {
        query = data;
      } else if (data && typeof data.query === "string") {
        query = data.query;
      }

      if (!query || !query.trim()) {
        console.error("Invalid query in fatsecretSearch. data was:", data);
        throw new HttpsError(
          "invalid-argument",
          "Missing or invalid 'query' parameter"
        );
      }

      query = query.trim();
      console.log("fatsecretSearch using query:", query);

      // Read secrets
      const clientId = FATSECRET_CLIENT_ID.value();
      const clientSecret = FATSECRET_CLIENT_SECRET.value();

      if (!clientId || !clientSecret) {
        console.error("FatSecret secrets missing at runtime");
        throw new HttpsError(
          "failed-precondition",
          "FatSecret API credentials are not configured on the server"
        );
      }

      // 1. Get OAuth2 token from FatSecret
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64"
      );

      const tokenResponse = await fetch(
        "https://oauth.fatsecret.com/connect/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: "basic",
          }),
        }
      );

      const tokenText = await tokenResponse.text();
      console.log("FatSecret token raw response:", tokenText);

      if (!tokenResponse.ok) {
        console.error("FatSecret token error:", tokenText);
        throw new HttpsError("unknown", "FatSecret token error: " + tokenText);
      }

      let tokenJson;
      try {
        tokenJson = JSON.parse(tokenText);
      } catch (e) {
        console.error("Failed to parse token JSON:", e);
        throw new HttpsError(
          "unknown",
          "Could not parse FatSecret token JSON"
        );
      }

      const accessToken = tokenJson.access_token;
      if (!accessToken) {
        console.error(
          "No access_token in FatSecret token response:",
          tokenJson
        );
        throw new HttpsError(
          "unknown",
          "FatSecret did not return an access token"
        );
      }

      console.log("Got FatSecret access token");

// Correct FatSecret Platform endpoint + method param
        const url = new URL("https://platform.fatsecret.com/rest/server.api");
        url.searchParams.set("method", "foods.search");
        url.searchParams.set("search_expression", query);
        url.searchParams.set("max_results", "10");
        url.searchParams.set("format", "json");
      const apiResponse = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const apiText = await apiResponse.text();
      console.log("FatSecret API raw response:", apiText);

      if (!apiResponse.ok) {
        console.error("FatSecret API error:", apiText);
        throw new HttpsError("unknown", "FatSecret API error: " + apiText);
      }

      let apiData;
      try {
        apiData = JSON.parse(apiText);
      } catch (e) {
        console.error("Failed to parse API JSON:", e);
        throw new HttpsError(
          "unknown",
          "Could not parse FatSecret API JSON"
        );
      }

      console.log("FatSecret API success");

      return {
        ok: true,
        data: apiData,
      };
    } catch (err) {
      console.error("fatsecretSearch error:", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("unknown", "Unexpected server error: " + String(err));
    }
  }
);

// AI Pantry Chatbot
exports.aiPantryChat = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (request) => {
    const uid =request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be signed in to use the AI assistant.");
    }

    const { message } = request.data || {};
    if (!message || typeof message !== "string") {
      throw new HttpsError("invalid-argument", "You must provide a 'message' string.");
    }

    try { 
      const pantrySnap = await db
      .collection("users")
      .doc(uid)
      .collection("pantry")
      .get();

    const pantryItems = pantrySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const pantryText = pantryItems
      .map(
        (i) => 
          `${i.name} - ${i.quantity} ${i.unit || ""} [${i.category || "uncategorized"}]` + 
          ( i.expiresOn ? ` (exp: ${i.expiresOn})` : "")
        )
      .join("\n";
        
    const client = new OpenAI({
        apiKey: OPENAI_API_KEY.value(),  
      });

      const instructions = `
You are a friendly college pantry assistant.
Use the pantry items to suggest cheap, simple meals.
Prefer 2-3 ideas and mention rough calories/macros.
If the pantry is empty, suggest low-cost basics they could buy.
`;

      const userPrompt = `
User pantry:
${pantryText || "(Pantry appears to be empty.)"}

User message:
${message}
`;

      const aiResponse = await client.responses.create({
        model: "gpt-4o-mini",
        instructions,
        input: userPrompt,
      });

      const replyText = aiResponse.output_text || "Sorry, I couldn't generate an answer.";

      return { reply: replyText };
    } catch (err) {
      console.error("aiPantryChat error:", err);
      throw new HttpsError("internal", "AI pantry assistant failed: " + String(err));
    }
  }
);
