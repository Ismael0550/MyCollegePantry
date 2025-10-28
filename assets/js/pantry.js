// 1) Firebase boot
const firebaseConfig = {
  apiKey: "AIzaSyAgF2KDMbiScAeDsv2NF9GLltQvz-QxAm0",
  authDomain: "mycollegepantry-f9317.firebaseapp.com",
  projectId: "mycollegepantry-f9317",
  storageBucket: "mycollegepantry-f9317.firebasestorage.app",
  messagingSenderId: "528613552373",
  appId: "1:528613552373:web:41b8e6770b701f28d7d5bc",
  measurementId: "G-RXSYTPY9T1"
};

if (!window.firebase?.apps?.length){
    window.firebase.initializeApp(firebaseConfig);
}

const auth = window.firebase.auth();
const db = window.firebase.firestore();

// 2) Simple auth guard (adjust for your app flow)
auth.onAuthStateChanged(user => {
    if (!user) {
        // window.location.href = "/login.html"; // uncomment when you have a login page
        console.warn("No user; using anon for dev");
        auth.signInAnonymously().catch(console.error);
    }
});

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

// 4) Add/edit dialog wiring
addBtn.onclick = () => openDialog();
closeDlg.onclick = () => dlg.close();
form.onsubmit = async (e) => {
    e.preventDefault();
    const uid = (auth.currentUser && auth.currentUser.uid) || null;
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
        await db.collection('pantryItems').add(data);
    } else {
        await db.collection('pantryItems').doc(docId).update(data);
    }
    dlg.close();
    form.reset();
};

function openDialog(item) {
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
auth.onAuthStateChanged(user => {
    if (!user) return;
    db.collection('pantryItems')
        .where('userId', 'in', [user.uid, null]) // include anon/dev entries if any
        .orderBy('createdAt', 'desc')
        .onSnapshot(snap => {
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
            const ref = db.collection('pantryItems').doc(id);
            await db.runTransaction(async tx => {
                const snap = await tx.get(ref);
                const qty = (snap.data()?.qty || 0) + 1;
                tx.update(ref, { qty, updatedAt: Date.now() });
            });
        } else if (act === 'dec') {
            const ref = db.collection('pantryItems').doc(id);
            await db.runTransaction(async tx => {
                const snap = await tx.get(ref);
                const qty = Math.max(0, (snap.data()?.qty || 0) - 1);
                tx.update(ref, { qty, updatedAt: Date.now() });
            });
        } else if (act === 'edit') {
            const it = allItems.find(x => x.id === id);
            openDialog(it);
        } else if (act === 'del') {
            if (confirm('Delete this item?')) await db.collection('pantryItems').doc(id).delete();
        }
    };
}

// bulk delete
deleteSelectedBtn.onclick = async () => {
    const ids = [...document.querySelectorAll('.sel:checked')].map(cb => cb.dataset.id);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} item(s)?`)) return;
    const batch = db.batch();
    ids.forEach(id => batch.delete(db.collection('pantryItems').doc(id)));
    await batch.commit();
};

// utilities
function escapeHtml(s) { return s?.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])) || '' }