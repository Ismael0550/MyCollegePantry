// assets/js/fatsecret.js
console.log("fatsecret.js loaded");

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwsGZryXdZPzL24k1QYaIdzYWme_A308k",
  authDomain: "mycollegepantry.firebaseapp.com",
  projectId: "mycollegepantry",
  storageBucket: "mycollegepantry.appspot.com",
  messagingSenderId: "946902867725",
  appId: "1:946902867725:web:c917820215b9291ce91a44",
  measurementId: "G-9GEJ9SGQE4"
};

// Reuse existing app if already initialized somewhere else
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const functions = getFunctions(app);

const fatsecretSearchCallable = httpsCallable(functions, "fatsecretSearch");

// Exported function you can call from anywhere
export async function searchFoodFatsecret(query) {
  console.log("searchFoodFatsecret called with:", query, "type:", typeof query);

  if (!query || !query.trim()) {
    throw new Error("Empty query passed into searchFoodFatsecret");
  }

  const clean = query.trim();

  const res = await fatsecretSearchCallable({ query: clean });

  // Cloud Function returns: { ok: true, data: <fatsecret JSON> }
  return res.data;
}
