import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
