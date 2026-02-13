import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    collection,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// State Management
let appState = {
    items: [],
    categories: ['文房具', '日用品', '食品'],
    history: [],
    sortOrder: 'custom',
    user: null
};

let db, auth;
let unsubscribeItems, unsubscribeHistory;

// Initialize Firebase and App
export function initApp(firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    setupAuthListener();
    setupAuthUI();
}

function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User logged in:", user.uid);
            appState.user = user;
            updateUserProfileUI(user);
            showApp();

            // Listen to real-time updates from Firestore
            startSyncing(user.uid);
        } else {
            console.log("User logged out");
            appState.user = null;
            stopSyncing();
            showAuth();
        }
    });
}

function startSyncing(userId) {
    const userDocRef = doc(db, "users", userId);

    // items collection
    const itemsRef = collection(db, "users", userId, "items");
    unsubscribeItems = onSnapshot(itemsRef, (snapshot) => {
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        appState.items = items;
        renderItems();
        updateOptimizationStats();
    });

    // history collection
    const historyRef = collection(db, "users", userId, "history");
    const q = query(historyRef, orderBy("timestamp", "desc"));
    unsubscribeHistory = onSnapshot(q, (snapshot) => {
        const history = [];
        snapshot.forEach(doc => history.push({ id: doc.id, ...doc.data() }));
        appState.history = history;
        if (document.getElementById('tab-history').classList.contains('active')) {
            renderHistory();
        }
    });

    // categories are stored in the user document
    onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            if (data.categories) {
                appState.categories = data.categories;
                renderCategories();
            }
        } else {
            // Initialize user document if it doesn't exist
            setDoc(userDocRef, { categories: appState.categories }, { merge: true });
        }
    });
}

function stopSyncing() {
    if (unsubscribeItems) unsubscribeItems();
    if (unsubscribeHistory) unsubscribeHistory();
}

// UI Transition
function showApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initAppComponents();
}

function showAuth() {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
}

function initAppComponents() {
    renderCategories();
    renderItems();
    setupEventListeners();
    setupTabNavigation();
    updateOptimizationStats();
}

// Auth UI Handlers
function setupAuthUI() {
    console.log("Setting up Auth UI listeners...");

    // Show Signup
    const showSignupBtn = document.getElementById('show-signup');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switching to signup view");
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.remove('hidden');
        });
    } else {
        console.error("Signup link not found!");
    }

    // Show Login
    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switching to login view");
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('login-view').classList.remove('hidden');
        });
    }

    // Google Login
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            console.log("Google login triggered");
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Google Auth Error:", error);
                alert("Googleログインに失敗しました: " + error.message);
            }
        });
    }

    // Email Login
    const loginForm = document.getElementById('email-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            console.log("Email login attempt:", email);
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error("Login Error:", error);
                alert("ログインに失敗しました: " + error.message);
            }
        });
    }

    // Email Signup
    const signupForm = document.getElementById('email-signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            console.log("Email signup attempt:", email);
            try {
                await createUserWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error("Signup Error:", error);
                alert("新規登録に失敗しました: " + error.message);
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("ログアウトしますか？")) {
                signOut(auth);
            }
        });
    }
}

function updateUserProfileUI(user) {
    const photoEl = document.getElementById('user-photo');
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email-display');

    if (nameEl) nameEl.textContent = user.displayName || user.email.split('@')[0];
    if (emailEl) emailEl.textContent = user.email;
    if (photoEl) {
        if (user.photoURL) {
            photoEl.src = user.photoURL;
            photoEl.classList.remove('hidden');
        } else {
            photoEl.classList.add('hidden');
        }
    }
}

// Data Actions (Firestore synced)
async function cloudSaveItem(item) {
    if (!appState.user) return;
    const itemRef = doc(db, "users", appState.user.uid, "items", item.id);
    await setDoc(itemRef, item);
}

async function cloudDeleteItem(id) {
    if (!appState.user) return;
    const itemRef = doc(db, "users", appState.user.uid, "items", id);
    // In a real app we might want to delete it, but simple way is setting a flag or actual delete
    // Using delete for clean database
    const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    await deleteDoc(itemRef);
}

async function cloudSaveHistory(entry) {
    if (!appState.user) return;
    const historyRef = doc(collection(db, "users", appState.user.uid, "history"));
    await setDoc(historyRef, { ...entry, timestamp: Date.now() });
}

async function cloudSaveCategories() {
    if (!appState.user) return;
    const userDocRef = doc(db, "users", appState.user.uid);
    await setDoc(userDocRef, { categories: appState.categories }, { merge: true });
}

// Rendering Logic
function renderCategories() {
    const filterSelect = document.getElementById('category-filter');
    const modalSelect = document.getElementById('item-category');
    const adminList = document.getElementById('category-list-admin');

    if (modalSelect) {
        modalSelect.innerHTML = '';
        appState.categories.forEach(cat => modalSelect.add(new Option(cat, cat)));
    }

    if (adminList) {
        adminList.innerHTML = '';
        appState.categories.forEach(cat => {
            const inUse = appState.items.some(i => i.category === cat);
            const row = document.createElement('div');
            row.className = 'category-item-row';
            row.innerHTML = `
                <span>${cat} ${inUse ? '<small>(使用中)</small>' : ''}</span>
                <button class="btn-icon delete-cat-btn" data-cat="${cat}" ${inUse ? 'disabled' : ''}>削除</button>
            `;
            adminList.appendChild(row);
        });
    }
}

function renderItems() {
    const listContainer = document.getElementById('item-list');
    const displayMode = document.getElementById('display-mode-select')?.value || 'list';
    const searchQuery = document.getElementById('search-input')?.value || '';
    if (!listContainer) return;

    let items = [...appState.items];

    if (searchQuery) items = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const sortVal = document.getElementById('sort-select')?.value || 'custom';
    if (sortVal === 'name') items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
    else if (sortVal === 'count') items.sort((a, b) => (b.count || 0) - (a.count || 0));
    else if (sortVal === 'updated') items.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
    else items.sort((a, b) => (a.order || 0) - (b.order || 0));

    const countBadge = document.getElementById('item-count-badge');
    if (countBadge) countBadge.textContent = items.length;

    listContainer.innerHTML = '';
    if (displayMode === 'grouped') {
        renderGroupedItems(items, listContainer);
    } else {
        items.forEach(item => listContainer.appendChild(createItemCard(item)));
    }
}

function renderGroupedItems(items, container) {
    const groups = {};
    appState.categories.forEach(cat => groups[cat] = []);
    items.forEach(item => { if (!groups[item.category]) groups[item.category] = []; groups[item.category].push(item); });

    container.style.display = 'block';
    Object.keys(groups).forEach(cat => {
        const groupItems = groups[cat];
        if (groupItems.length === 0) return;
        const section = document.createElement('section');
        section.className = 'category-section';
        headerHtml(section, cat, groupItems.length);
        const grid = document.createElement('div');
        grid.className = 'grid-layout';
        groupItems.forEach(item => grid.appendChild(createItemCard(item)));
        section.appendChild(grid);
        container.appendChild(section);
    });
}

function headerHtml(el, name, count) {
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span>${name}</span><span class="badge">${count}</span>`;
    el.appendChild(header);
}

function createItemCard(item) {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.dataset.id = item.id;
    div.draggable = true;
    const imageUrl = item.image || 'https://via.placeholder.com/200x200?text=No+Image';
    div.innerHTML = `
        <div class="image-container">
            <img src="${imageUrl}" class="item-image edit-trigger">
            <div class="count-overlay">
                <button class="card-count-btn reduce" data-id="${item.id}">−</button>
                <div class="card-count-display">${item.count}</div>
                <button class="card-count-btn add" data-id="${item.id}">＋</button>
            </div>
        </div>
        <div class="item-info-row edit-trigger"><div class="item-name">${item.name}</div></div>
    `;
    div.querySelectorAll('.edit-trigger').forEach(el => el.addEventListener('click', () => openEditModal(item.id)));

    // Drag and drop logic (only for custom sort)
    div.addEventListener('dragstart', (e) => {
        if (document.getElementById('display-mode-select').value === 'grouped') return e.preventDefault();
        if (document.getElementById('sort-select').value !== 'custom') return e.preventDefault();
        e.dataTransfer.setData('text/plain', item.id);
        div.classList.add('dragging');
    });
    div.addEventListener('dragend', () => div.classList.remove('dragging'));
    div.addEventListener('dragover', e => e.preventDefault());
    div.addEventListener('drop', async e => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId === item.id) return;
        const fromIdx = appState.items.findIndex(i => i.id === draggedId);
        const toIdx = appState.items.findIndex(i => i.id === item.id);
        if (fromIdx !== -1 && toIdx !== -1) {
            const [moved] = appState.items.splice(fromIdx, 1);
            appState.items.splice(toIdx, 0, moved);
            // Bulk update orders
            await Promise.all(appState.items.map((it, idx) => {
                it.order = idx;
                return cloudSaveItem(it);
            }));
        }
    });
    return div;
}

// History
function addHistory(itemName, action, from, to) {
    const entry = {
        date: new Date().toLocaleString('ja-JP'),
        itemName, action, from, to
    };
    cloudSaveHistory(entry);
}

function renderHistory() {
    const body = document.getElementById('history-list-body');
    if (!body) return;
    body.innerHTML = '';
    appState.history.slice(0, 100).forEach(entry => {
        const tr = document.createElement('tr');
        const badgeClass = entry.action === '追加' ? 'action-add' : entry.action === '削減' ? 'action-reduce' : 'action-create';
        tr.innerHTML = `
            <td><div style="font-size:0.7rem; color:#95a5a6">${entry.date}</div><div style="font-weight:600">${entry.itemName}</div></td>
            <td><span class="action-badge ${badgeClass}">${entry.action}</span></td>
            <td style="text-align:right"><span style="color:#bdc3c7">${entry.from}</span> → <strong>${entry.to}</strong></td>
        `;
        body.appendChild(tr);
    });
}

// Modal handling
function openEditModal(id) {
    const item = appState.items.find(i => i.id === id);
    if (!item) return;
    const modal = document.getElementById('item-modal');
    document.getElementById('modal-title').textContent = 'アイテムを編集';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-category').value = item.category;
    document.getElementById('item-count').value = item.count;
    document.getElementById('item-image').value = item.image || '';
    const preview = document.getElementById('image-preview-container');
    preview.innerHTML = item.image ? `<img src="${item.image}">` : '<span class="placeholder">画像をアップロード</span>';
    const container = document.getElementById('links-container');
    container.innerHTML = '';
    (item.links || []).forEach(l => addLinkInput(l.label, l.url));
    document.getElementById('delete-item-btn').classList.remove('hidden');
    modal.classList.remove('hidden');
}

function addLinkInput(label = '', url = '') {
    const div = document.createElement('div');
    div.className = 'link-input-group';
    div.innerHTML = `
        <input type="text" placeholder="名前" value="${label}" style="width:30%">
        <input type="url" placeholder="URL" value="${url}" style="width:60%">
        <button type="button" class="remove-link-btn">&times;</button>
    `;
    document.getElementById('links-container').appendChild(div);
}

// Event Listeners
function setupEventListeners() {
    // FAB
    document.getElementById('add-item-btn')?.addEventListener('click', () => {
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
        document.getElementById('modal-title').textContent = 'アイテムを追加';
        document.getElementById('links-container').innerHTML = '';
        document.getElementById('image-preview-container').innerHTML = '<span class="placeholder">画像をアップロード</span>';
        document.getElementById('delete-item-btn').classList.add('hidden');
        document.getElementById('item-modal').classList.remove('hidden');
    });

    document.getElementById('close-modal-btn')?.addEventListener('click', () => document.getElementById('item-modal').classList.add('hidden'));

    document.getElementById('item-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('item-id').value || Date.now().toString();
        const isNew = !document.getElementById('item-id').value;
        const links = [];
        document.querySelectorAll('.link-input-group').forEach(group => {
            const inputs = group.querySelectorAll('input');
            if (inputs[1].value) links.push({ label: inputs[0].value || 'リンク', url: inputs[1].value });
        });

        const formData = {
            id,
            name: document.getElementById('item-name').value,
            category: document.getElementById('item-category').value,
            count: parseInt(document.getElementById('item-count').value) || 0,
            image: document.getElementById('item-image').value,
            links: links,
            lastUpdated: new Date().toLocaleDateString('ja-JP')
        };

        if (isNew) {
            formData.order = appState.items.length;
            addHistory(formData.name, '新規登録', 0, formData.count);
        } else {
            const old = appState.items.find(i => i.id === id);
            addHistory(formData.name, '情報更新', old ? old.count : 0, formData.count);
        }

        await cloudSaveItem(formData);
        document.getElementById('item-modal').classList.add('hidden');
    });

    document.getElementById('item-list')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.card-count-btn');
        if (!btn) return;
        const item = appState.items.find(i => i.id === btn.dataset.id);
        if (!item) return;
        const prev = item.count;
        const delta = btn.classList.contains('add') ? 1 : -1;
        item.count = Math.max(0, item.count + delta);
        if (prev !== item.count) {
            item.lastUpdated = new Date().toLocaleDateString('ja-JP');
            addHistory(item.name, delta > 0 ? '追加' : '削減', prev, item.count);
            await cloudSaveItem(item);
        }
    });

    document.getElementById('delete-item-btn')?.addEventListener('click', async () => {
        const id = document.getElementById('item-id').value;
        if (id && confirm('削除しますか？')) {
            await cloudDeleteItem(id);
            document.getElementById('item-modal').classList.add('hidden');
        }
    });

    // Filters
    document.getElementById('display-mode-select')?.addEventListener('change', renderItems);
    document.getElementById('sort-select')?.addEventListener('change', renderItems);
    document.getElementById('search-input')?.addEventListener('input', renderItems);

    // Settings
    document.getElementById('add-category-btn')?.addEventListener('click', async () => {
        const name = prompt('新しいカテゴリ名:');
        if (name && !appState.categories.includes(name)) {
            appState.categories.push(name);
            await cloudSaveCategories();
        }
    });

    document.getElementById('category-list-admin')?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-cat-btn')) {
            const cat = e.target.dataset.cat;
            appState.categories = appState.categories.filter(c => c !== cat);
            await cloudSaveCategories();
        }
    });

    document.getElementById('add-link-btn')?.addEventListener('click', () => addLinkInput());
    document.getElementById('links-container')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-link-btn')) e.target.parentElement.remove();
    });

    // Image Upload
    document.getElementById('item-image-file')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async event => {
                const compressed = await compressImage(event.target.result, 400);
                document.getElementById('item-image').value = compressed;
                document.getElementById('image-preview-container').innerHTML = `<img src="${compressed}">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

function setupTabNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.dataset.tab;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tabName}`).classList.add('active');
            if (tabName === 'history') renderHistory();
            if (tabName === 'home') renderItems();
            window.scrollTo(0, 0);
        });
    });
}

async function compressImage(base64, maxWidth) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
}

async function updateOptimizationStats() {
    // Firestore handles optimization better, but keeping for UI consistency
    const legacySize = document.getElementById('save-legacy');
    if (legacySize) legacySize.textContent = "0KB";
}
