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
