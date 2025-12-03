console.log("firebase-innit loaded");

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwsGZryXdZPzL24k1QYaIdzYWme_A308k",
  authDomain: "mycollegepantry.firebaseapp.com",
  projectId: "mycollegepantry",
  storageBucket: "mycollegepantry.appspot.com",
  messagingSenderId: "946902867725",
  appId: "1:946902867725:web:c917820215b9291ce91a44",
  measurementId: "G-9GEJ9SGQE4"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

cd functions
npm install openai
firebase functions:secrets:set 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
