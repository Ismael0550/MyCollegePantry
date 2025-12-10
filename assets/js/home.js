import { db, auth } from "/assets/js/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const toNum = v => Number(v || 0);
const todayISO = () => new Date().toISOString().slice(0, 10);

// grab the snapshot elements
const snapCal = document.getElementById("snapCal");
const snapPro = document.getElementById("snapPro");
const snapCar = document.getElementById("snapCar");
const snapFat = document.getElementById("snapFat");

// helper to write into the UI
function renderSnapshot(totals) {
  if (snapCal) snapCal.textContent = `Calories: ${totals.cal} kcal`;
  if (snapPro) snapPro.textContent = `Protein: ${totals.pro} g`;
  if (snapCar) snapCar.textContent = `Carbs: ${totals.car} g`;
  if (snapFat) snapFat.textContent = `Fats: ${totals.fat} g`;
}

// default to zero
renderSnapshot({ cal: 0, pro: 0, car: 0, fat: 0 });

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    return;
  }

  const day = todayISO();

  const q = query(
    collection(db, "diaryMeals"),
    where("userId", "==", user.uid),
    where("date", "==", day)
  );

  try {
    const snap = await getDocs(q);

    const totals = { cal: 0, pro: 0, car: 0, fat: 0 };

    snap.forEach(doc => {
      const m = doc.data();
      totals.cal += toNum(m.calories);
      totals.pro += toNum(m.protein);
      totals.car += toNum(m.carbs);
      totals.fat += toNum(m.fat);
    });

    renderSnapshot(totals);
} catch (err) {}
});