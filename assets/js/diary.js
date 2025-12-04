// /assets/js/diary.js
import { db, auth } from "/assets/js/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection, addDoc, getDoc, serverTimestamp,
  query, where, orderBy, onSnapshot,
  doc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

onAuthStateChanged(auth, user => {
  if (!user) return;
  watchDiary(document.getElementById("dDate").value);
});

// helpers
const todayISO = () => new Date().toISOString().slice(0, 10);
const toNum = v => Number(v || 0);
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function parseIngredients(text) {
  if (!text) return [];
  return text.split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(line => {
      const [name = '', qty = '', unit = ''] = line.split(',').map(x => x.trim());
      return { name, qty: Number(qty) || 0, unit };
    });
}

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

  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, "diaryMeals"),
    where("userId", "==", user.uid), 
    where("date", "==", dayISO)
  );

  stopWatching = onSnapshot(q, snap => {
    list.innerHTML = "";

    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

    const totals = { cal: 0, pro: 0, car: 0, fat: 0 };

    for (const m of rows) {
      totals.cal += toNum(m.calories);
      totals.pro += toNum(m.protein);
      totals.car += toNum(m.carbs);
      totals.fat += toNum(m.fat);

      const li = document.createElement("li");
      li.className = "meal";
      li.innerHTML = `
        <div class="grow">
          <div class="row">
            <strong>${(m.mealType || '').toUpperCase()}</strong>
            <span class="muted">${esc(m.date || '')}</span>
          </div>

          <div>${esc(m.title || '')}</div>

          <div class="muted" style="margin-top:6px;">
            ${m.calories} kcal · P ${m.protein} · C ${m.carbs} · F ${m.fat}
          </div>

          ${m.notes ? `<div class="muted" style="margin-top:4px;">"${esc(m.notes)}"</div>` : ""}
        </div>

        <div class="btn-col">
        <button class="btn solid small-dup" data-dup="${m.id}">+</button>
        <button class="danger" data-id="${m.id}">Delete</button>
      `;
      list.appendChild(li);
    }

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

  const user = auth.currentUser;
  if (!user) return;

  const payload = {
    date: document.getElementById("dDate").value,
    mealType: document.getElementById("dMeal").value,
    title: document.getElementById("fatsecret-input").value.trim(),
    calories: toNum(document.getElementById("dCal").value),
    protein:  toNum(document.getElementById("dPro").value),
    carbs:    toNum(document.getElementById("dCar").value),
    fat:      toNum(document.getElementById("dFat").value),
    ingredients: parseIngredients(document.getElementById("dIngr")?.value || ""),
    notes:    document.getElementById("dNotes").value.trim(),
    createdAt: serverTimestamp(),
    userId: user.uid

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

// add 
list.addEventListener("click", async e => {
  const dupBtn = e.target.closest("button[data-dup]");
  if (!dupBtn) return;

  const id = dupBtn.dataset.dup;
  const ref = doc(db, "diaryMeals", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();
  delete data.createdAt;
  data.createdAt = serverTimestamp();

  await addDoc(collection(db, "diaryMeals"), data);
});
