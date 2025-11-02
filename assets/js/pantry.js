import { auth as _auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  runTransaction, writeBatch, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const auth = {
  onAuthStateChanged: (cb) => onAuthStateChanged(_auth, cb),
  signInAnonymously: () => signInAnonymously(_auth),
  get currentUser() { return _auth.currentUser; }
};

// 3) UI elements
const listEl = document.getElementById('items');
const dlg = document.getElementById('itemDlg');
const form = document.getElementById('itemForm');
const addBtn = document.getElementById('addBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const closeDlg = document.getElementById('closeDlg');
const statTotal = document.getElementById('statTotal');
const statLow = document.getElementById('statLow');
const statExp = document.getElementById('statExp');
const statZero = document.getElementById('statZero');
const q = document.getElementById('q');
const filterCategory = document.getElementById('filterCategory');
const filterLocation = document.getElementById('filterLocation');
const sortBy = document.getElementById('sortBy');
const confirmDlg    = document.getElementById('confirmDlg'); // confirm delete
const confirmYes    = document.getElementById('confirmYes');
const confirmCancel = document.getElementById('confirmCancel');
const confirmClose  = document.getElementById('confirmClose');


function showConfirm() {
  return new Promise(resolve => {
    const done = (ans) => { confirmDlg.close(); cleanup(); resolve(ans); };
    const onYes = () => done(true);
    const onNo  = () => done(false);
    const cleanup = () => {
      confirmYes.removeEventListener('click', onYes);
      confirmCancel.removeEventListener('click', onNo);
      confirmClose.removeEventListener('click', onNo);
    };
    confirmYes.addEventListener('click', onYes);
    confirmCancel.addEventListener('click', onNo);
    confirmClose.addEventListener('click', onNo);
    confirmDlg.showModal();
  });
}


// 4) Add/edit dialog wiring
addBtn.onclick = () => openDialog();
closeDlg.onclick = () => dlg.close();
form.onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {alert('Signing in...'); return;}
    const uid = user.uid;
    const docId = document.getElementById('f_id').value || null;
    const data = {
        name: document.getElementById('f_name').value.trim(),
        category: document.getElementById('f_category').value,
        qty: Number(document.getElementById('f_qty').value || 0),
        unit: document.getElementById('f_unit').value.trim(),
        location: document.getElementById('f_location').value,
        expiresOn: document.getElementById('f_expiresOn').value || null,
        notes: document.getElementById('f_notes').value.trim(),
        userId: uid,
        updatedAt: Date.now(),
    };
    if (!docId) {
        data.createdAt = Date.now();
        await addDoc(collection(db, 'pantryItems'), data);
    } else {
        await updateDoc(doc(db, 'pantryItems', docId), data);
    }
    dlg.close();
    form.reset();
};

function openDialog(item) {
  // Use touched to reset per dialog
    touched = { category:false, unit:false, location:false };
    document.getElementById('dlgTitle').textContent = item ? 'Edit item' : 'Add item';
    ['f_id', 'f_name', 'f_category', 'f_qty', 'f_unit', 'f_location', 'f_expiresOn', 'f_notes'].forEach(id => {
        const el = document.getElementById(id);
        el.value = item ? (id === 'f_id' ? item.id :
        id === 'f_name' ? item.name :
        id === 'f_category' ? item.category :
        id === 'f_qty' ? item.qty :
        id === 'f_unit' ? item.unit :
        id === 'f_location' ? item.location :
        id === 'f_expiresOn' ? (item.expiresOn || '') :
        item.notes || '') : (id === 'f_qty' ? 1 : '');
    });
    dlg.showModal();
}

// 5) Live query + client-side filtering/sorting
let allItems = [];
let unsubscribe = null; // track Firestore listener

// -Autofill-

// 1) Temporary seed list for autofill 
const DEFAULTS = {
  "eggs": { category: "protein", unit: "pcs", location: "fridge" },
  "milk": { category: "protein", unit: "gal", location: "fridge" },
  "rice": { category: "carb", unit: "lb", location: "pantry" },

// Follow same struture to add more seed items

};

let touched = { category:false, unit:false, location:false };
function markTouched(which){ touched[which] = true; }

// Apply hints 
function applyDefaultsSmart(hint){
  if (!hint) return;
  const catEl  = document.getElementById('f_category');
  const unitEl = document.getElementById('f_unit');
  const locEl  = document.getElementById('f_location');

  if (catEl  && !touched.category && hint.category)  catEl.value  = hint.category;
  if (unitEl && !touched.unit     && hint.unit)      unitEl.value = hint.unit;
  if (locEl  && !touched.location && hint.location)  locEl.value  = hint.location;
}


// Autofill when typing a name
document.getElementById('f_category')?.addEventListener('change', () => markTouched('category'));
document.getElementById('f_unit')?.addEventListener('change',     () => markTouched('unit'));
document.getElementById('f_location')?.addEventListener('change', () => markTouched('location'));

// Live autofill
const nameEl = document.getElementById('f_name');
nameEl?.addEventListener('input', () => {
  const key = nameEl.value.trim().toLowerCase();
  if (!key) return;

  const fromHistory = Array.isArray(allItems)
    ? allItems.find(it => (it.name || '').trim().toLowerCase() === key)
    : null;

  applyDefaultsSmart(fromHistory || DEFAULTS[key]);
});


onAuthStateChanged(_auth, (user) => {
  if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
  if (!user) return;

  const qRef = query(
    collection(db, 'pantryItems'),
    where('userId', '==', user.uid)
    );


  unsubscribe = onSnapshot(qRef, (snap) => {
    allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
});

// Filters/sorts
[q, filterCategory, filterLocation, sortBy].forEach(el => el.addEventListener('input', render));

function render() {
    const term = q.value.trim().toLowerCase();
    const now = new Date();
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let items = allItems.filter(it => {
        if (filterCategory.value && it.category !== filterCategory.value) return false;
        if (filterLocation.value && it.location !== filterLocation.value) return false;
        if (term && !(`${it.name} ${it.notes || ''}`.toLowerCase().includes(term))) return false;
        return true;
    });

    // sort
    items.sort((a, b) => {
        const mode = sortBy.value;
        if (mode === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
        if (mode === 'qtyAsc') return (a.qty || 0) - (b.qty || 0);
        if (mode === 'createdDesc') return (b.createdAt || 0) - (a.createdAt || 0);
        // expiresAsc default
        const da = a.expiresOn ? new Date(a.expiresOn).getTime() : Infinity;
        const dbb = b.expiresOn ? new Date(b.expiresOn).getTime() : Infinity;
        return da - dbb;
    });

    // stats
    const low = items.filter(i => i.qty > 0 && i.qty <= 1).length;
    const zero = items.filter(i => (i.qty || 0) === 0).length;
    const exp = items.filter(i => i.expiresOn && new Date(i.expiresOn) <= soon).length;
    statTotal.textContent = items.length;
    statLow.textContent = low;
    statZero.textContent = zero;
    statExp.textContent = exp;

    // paint
    listEl.innerHTML = '';
    for (const it of items) {
        const expires = it.expiresOn ? new Date(it.expiresOn) : null;
        const flags = [
            (it.qty || 0) === 0 ? 'low' : '',
            (it.qty || 0) <= 1 ? 'low' : '',
            (expires && expires <= soon) ? 'expiring' : ''
        ].filter(Boolean).join(' ');
        const el = document.createElement('article');
        el.className = `card item ${flags}`;
        el.innerHTML = `
          <div class="row">
            <h3>${escapeHtml(it.name || 'Unnamed')}</h3>
            <label class="chip"><input type="checkbox" data-id="${it.id}" class="sel"> Select</label>
          </div>
          <div class="row">
            <div class="qty">
              <button data-act="dec" data-id="${it.id}">−</button>
              <strong>${it.qty || 0}</strong>
              <button data-act="inc" data-id="${it.id}">+</button>
              <span class="muted">${it.unit || ''}</span>
            </div>
            <span class="chip">${it.category || 'other'}</span>
            <span class="chip">${it.location || 'pantry'}</span>
          </div>
          <div class="row">
            <span class="muted">${expires ? 'Expires ' + expires.toLocaleDateString() : 'No date'}</span>
            <span class="muted">${escapeHtml(it.notes || '')}</span>
          </div>
          <div class="row">
            <button class="btn secondary" data-act="edit" data-id="${it.id}">Edit</button>
            <button class="btn danger" data-act="del" data-id="${it.id}">Delete</button>
          </div>
        `;
        listEl.appendChild(el);
    }

    // delegate actions
    listEl.onclick = async (e) => {
        const id = e.target.getAttribute('data-id');
        const act = e.target.getAttribute('data-act');
        if (!id || !act) return;

        if (act === 'inc') {
            const ref = doc(db, 'pantryItems', id);
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                const qty = (snap.data()?.qty || 0) + 1;
                tx.update(ref, { qty, updatedAt: Date.now() });
            });

        } else if (act === 'dec') {
            const ref = doc(db, 'pantryItems', id);
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                const current = (snap.data()?.qty ?? 0);
                const qty = Math.max(0, current - 1);
                tx.update(ref, { qty, updatedAt: Date.now() });
            });
        } else if (act === 'edit') {
            const it = allItems.find(x => x.id === id);
            openDialog(it);
        } else if (act === 'del') {
            if (await showConfirm()){
                await deleteDoc(doc(db, 'pantryItems', id));

            }
        }
    };
}

// bulk delete
deleteSelectedBtn.onclick = async () => {
    const ids = [...document.querySelectorAll('.sel:checked')].map(cb => cb.dataset.id);
    if (!ids.length) return;
    if (!(await showConfirm())) return;
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(db, 'pantryItems', id)));
    await batch.commit();

};

// utilities
function escapeHtml(s) { return s?.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])) || '' }