// /assets/js/diary.js
import { db } from "/assets/js/firebase-init.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, orderBy, onSnapshot,
  doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// helpers
const todayISO = () => new Date().toISOString().slice(0, 10);
const toNum = v => Number(v || 0);

// elements
const form   = document.getElementById("diaryForm");
const picker = document.getElementById("picker");
const dayLbl = document.getElementById("dayLabel");
const list   = document.getElementById("mealList");
const tCal = document.getElementById("tCal");
const tPro = document.getElementById("tPro");
const tCar = document.getElementById("tCar");
const tFat = document.getElementById("tFat");

// defaults
const initialDay = todayISO();
document.getElementById("dDate").value = initialDay;
picker.value = initialDay;
dayLbl.textContent = initialDay;

let stopWatching = null;

function watchDiary(dayISO) {
  if (typeof stopWatching === "function") stopWatching();

  const q = query(
    collection(db, "diaryMeals"),
    where("date", "==", dayISO),
    orderBy("createdAt", "desc")
  );

  stopWatching = onSnapshot(q, snap => {
    list.innerHTML = "";
    const totals = { cal: 0, pro: 0, car: 0, fat: 0 };

    snap.forEach(d => {
      const m = d.data();
      totals.cal += toNum(m.calories);
      totals.pro += toNum(m.protein);
      totals.car += toNum(m.carbs);
      totals.fat += toNum(m.fat);

      const li = document.createElement("li");
      li.className = "meal";
      li.innerHTML = `
        <div class="grow">
          <div class="row">
            <strong>${m.mealType.toUpperCase()}</strong>
            <span class="muted">${m.date}</span>
          </div>
          <div>${m.title}</div>
          <div class="muted">${m.calories} kcal · P ${m.protein} · C ${m.carbs} · F ${m.fat}</div>
          ${m.notes ? `<div class="muted">"${m.notes}"</div>` : ""}
        </div>
        <button class="danger" data-id="${d.id}">Delete</button>
      `;
      list.appendChild(li);
    });

    tCal.textContent = `${totals.cal} kcal`;
    tPro.textContent = `${totals.pro} g protein`;
    tCar.textContent = `${totals.car} g carbs`;
    tFat.textContent = `${totals.fat} g fat`;
  });
}

watchDiary(initialDay);

picker.addEventListener("change", e => {
  const day = e.target.value || todayISO();
  dayLbl.textContent = day;
  watchDiary(day);
});

form.addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {
    date: document.getElementById("dDate").value,
    mealType: document.getElementById("dMeal").value,
    title: document.getElementById("dTitle").value.trim(),
    calories: toNum(document.getElementById("dCal").value),
    protein:  toNum(document.getElementById("dPro").value),
    carbs:    toNum(document.getElementById("dCar").value),
    fat:      toNum(document.getElementById("dFat").value),
    notes:    document.getElementById("dNotes").value.trim(),
    createdAt: serverTimestamp()
    // userId later
  };
  if (!payload.title) return;

  await addDoc(collection(db, "diaryMeals"), payload);
  form.reset();
  document.getElementById("dDate").value = picker.value; // keep same day
});

// delete via event delegation
list.addEventListener("click", async e => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  await deleteDoc(doc(db, "diaryMeals", btn.dataset.id));
});
