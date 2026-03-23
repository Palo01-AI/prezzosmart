diff --git a/script.js b/script.js
index 4240c59edee33ff2288fac15d320beaddd0d313e..c07ab6d791ba1ec57679e532ff2bd6a16b2e68af 100644
--- a/script.js
+++ b/script.js
@@ -1,130 +1,548 @@
-// Simple Memory Match game (vanilla JS)
-const symbols = ["🍎","🚀","🎲","🐱","⚽","🎧"];
+const DB_KEY = "prezzo_smart_db_v1";
+const SESSION_KEY = "prezzo_smart_session_v1";
 
-const boardEl = document.getElementById("gameBoard");
-const movesEl = document.getElementById("moves");
-const scoreEl = document.getElementById("score");
-const matchesEl = document.getElementById("matches");
-const totalPairsEl = document.getElementById("totalPairs");
-const messageEl = document.getElementById("message");
-const restartBtn = document.getElementById("restartBtn");
+const el = {
+  authSection: document.getElementById("authSection"),
+  appSection: document.getElementById("appSection"),
+  adminSection: document.getElementById("adminSection"),
+  sessionState: document.getElementById("sessionState"),
+  logoutBtn: document.getElementById("logoutBtn"),
+  authMessage: document.getElementById("authMessage"),
+  registerForm: document.getElementById("registerForm"),
+  loginForm: document.getElementById("loginForm"),
+  marketFilter: document.getElementById("marketFilter"),
+  searchInput: document.getElementById("searchInput"),
+  productsContainer: document.getElementById("productsContainer"),
+  priceForm: document.getElementById("priceForm"),
+  priceMarket: document.getElementById("priceMarket"),
+  priceProduct: document.getElementById("priceProduct"),
+  priceValue: document.getElementById("priceValue"),
+  uploadMessage: document.getElementById("uploadMessage"),
+  contribList: document.getElementById("contribList"),
+  listMarket: document.getElementById("listMarket"),
+  listForm: document.getElementById("listForm"),
+  listProduct: document.getElementById("listProduct"),
+  listQty: document.getElementById("listQty"),
+  shoppingList: document.getElementById("shoppingList"),
+  listTotal: document.getElementById("listTotal"),
+  mapSummary: document.getElementById("mapSummary"),
+  bulkImportForm: document.getElementById("bulkImportForm"),
+  bulkMode: document.getElementById("bulkMode"),
+  bulkMarket: document.getElementById("bulkMarket"),
+  bulkFile: document.getElementById("bulkFile"),
+  bulkMessage: document.getElementById("bulkMessage")
+};
 
 let state = {
-  deck: [],
-  first: null,
-  second: null,
-  lock: false,
-  moves: 0,
-  score: 0,
-  matches: 0
+  db: null,
+  session: null,
+  map: null,
+  userMarker: null,
+  marketMarkers: []
 };
 
-function createDeck() {
-  const deck = [...symbols, ...symbols].map((symbol, id) => ({ id, symbol, matched: false }));
-  for (let i = deck.length - 1; i > 0; i--) {
-    const j = Math.floor(Math.random() * (i + 1));
-    [deck[i], deck[j]] = [deck[j], deck[i]];
+function initialData() {
+  return {
+    users: [
+      {
+        id: "admin-seed",
+        username: "admin",
+        passwordHash: hashPassword("admin123"),
+        isAdmin: true
+      }
+    ],
+    supermarkets: [
+      { id: "market_1", name: "SuperSpesa Centro", lat: 41.9028, lon: 12.4964 },
+      { id: "market_2", name: "MarketPiù Nord", lat: 41.916, lon: 12.48 },
+      { id: "market_3", name: "EcoStore Sud", lat: 41.885, lon: 12.51 }
+    ],
+    prices: {
+      market_1: { Latte: 1.49, Pane: 2.1, Pasta: 1.25, Uova: 2.79, Pomodori: 2.45, Riso: 2.15 },
+      market_2: { Latte: 1.39, Pane: 2.3, Pasta: 1.15, Uova: 2.99, Pomodori: 2.6, Riso: 2.35 },
+      market_3: { Latte: 1.55, Pane: 1.99, Pasta: 1.35, Uova: 2.49, Pomodori: 2.3, Riso: 2.29 }
+    },
+    contributions: [],
+    shoppingLists: {
+      "admin-seed": []
+    }
+  };
+}
+
+function loadState() {
+  state.db = JSON.parse(localStorage.getItem(DB_KEY) || "null") || initialData();
+  state.session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
+  migrateDb();
+}
+
+function migrateDb() {
+  state.db.users = (state.db.users || []).map((u) => ({ ...u, isAdmin: !!u.isAdmin }));
+  if (!state.db.users.some((u) => u.username.toLowerCase() === "admin")) {
+    state.db.users.push({
+      id: crypto.randomUUID(),
+      username: "admin",
+      passwordHash: hashPassword("admin123"),
+      isAdmin: true
+    });
   }
-  return deck;
+  if (!state.db.shoppingLists) state.db.shoppingLists = {};
+  state.db.users.forEach((u) => {
+    if (!state.db.shoppingLists[u.id]) state.db.shoppingLists[u.id] = [];
+  });
+  saveDB();
 }
 
-function setupGame() {
-  state = { deck: createDeck(), first: null, second: null, lock: false, moves: 0, score: 0, matches: 0 };
-  totalPairsEl.textContent = String(symbols.length);
-  messageEl.textContent = "Click two cards to find a pair.";
-  render();
-  updateStats();
+function saveDB() {
+  localStorage.setItem(DB_KEY, JSON.stringify(state.db));
 }
 
-function render() {
-  boardEl.innerHTML = "";
-  state.deck.forEach(card => {
-    const btn = document.createElement("button");
-    btn.className = "card";
-    btn.textContent = "?";
-    btn.dataset.id = String(card.id);
-    btn.addEventListener("click", () => onCardClick(card.id));
-    boardEl.appendChild(btn);
+function saveSession() {
+  localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
+}
+
+function hashPassword(pwd) {
+  return btoa(unescape(encodeURIComponent(pwd))).split("").reverse().join("");
+}
+
+function getCurrentUser() {
+  if (!state.session) return null;
+  return state.db.users.find((u) => u.id === state.session.userId) || null;
+}
+
+function getCurrentList() {
+  const user = getCurrentUser();
+  if (!user) return [];
+  return state.db.shoppingLists[user.id] || [];
+}
+
+function setCurrentList(list) {
+  const user = getCurrentUser();
+  if (!user) return;
+  state.db.shoppingLists[user.id] = list;
+  saveDB();
+}
+
+function euros(value) {
+  return `€${Number(value).toFixed(2)}`;
+}
+
+function fillMarketSelectors() {
+  const defaultOption = '<option value="all">Tutti i supermercati</option>';
+  el.marketFilter.innerHTML = defaultOption;
+  el.priceMarket.innerHTML = "";
+  el.listMarket.innerHTML = "";
+  el.bulkMarket.innerHTML = "";
+
+  state.db.supermarkets.forEach((market) => {
+    el.marketFilter.insertAdjacentHTML("beforeend", `<option value="${market.id}">${market.name}</option>`);
+    el.priceMarket.insertAdjacentHTML("beforeend", `<option value="${market.id}">${market.name}</option>`);
+    el.listMarket.insertAdjacentHTML("beforeend", `<option value="${market.id}">${market.name}</option>`);
+    el.bulkMarket.insertAdjacentHTML("beforeend", `<option value="${market.id}">${market.name}</option>`);
+  });
+}
+
+function productRows() {
+  const selectedMarket = el.marketFilter.value || "all";
+  const query = (el.searchInput.value || "").trim().toLowerCase();
+  const rows = [];
+
+  const targetMarkets =
+    selectedMarket === "all" ? state.db.supermarkets : state.db.supermarkets.filter((m) => m.id === selectedMarket);
+
+  targetMarkets.forEach((market) => {
+    const marketPrices = state.db.prices[market.id] || {};
+    Object.entries(marketPrices).forEach(([product, price]) => {
+      if (!query || product.toLowerCase().includes(query)) {
+        rows.push({ market: market.name, product, price });
+      }
+    });
   });
+
+  return rows.sort((a, b) => a.product.localeCompare(b.product));
+}
+
+function renderProducts() {
+  const rows = productRows();
+  if (!rows.length) {
+    el.productsContainer.innerHTML = "<p>Nessun prodotto trovato con i filtri attuali.</p>";
+    return;
+  }
+
+  el.productsContainer.innerHTML = rows
+    .map(
+      (row) => `
+      <article class="product-item">
+        <div>
+          <strong>${row.product}</strong>
+          <div class="muted">${row.market}</div>
+        </div>
+        <div><span class="badge">${euros(row.price)}</span></div>
+      </article>
+    `
+    )
+    .join("");
+}
+
+function renderContributions() {
+  const contributions = state.db.contributions.slice(-8).reverse();
+  if (!contributions.length) {
+    el.contribList.innerHTML = "<li>Nessun contributo al momento.</li>";
+    return;
+  }
+  el.contribList.innerHTML = contributions
+    .map(
+      (c) =>
+        `<li><span><strong>${c.product}</strong> · ${c.marketName} · ${euros(c.price)}</span><small>${c.username}</small></li>`
+    )
+    .join("");
 }
 
-function updateStats() {
-  movesEl.textContent = String(state.moves);
-  scoreEl.textContent = String(state.score);
-  matchesEl.textContent = String(state.matches);
+function marketPriceForProduct(marketId, product) {
+  return state.db.prices[marketId]?.[product] || null;
 }
 
-function cardButton(id) {
-  return boardEl.querySelector(`.card[data-id="${id}"]`);
+function renderShoppingList() {
+  const list = getCurrentList();
+  const marketId = el.listMarket.value;
+
+  if (!list.length) {
+    el.shoppingList.innerHTML = "<li>Lista vuota. Aggiungi un prodotto.</li>";
+    el.listTotal.textContent = euros(0);
+    return;
+  }
+
+  let total = 0;
+  el.shoppingList.innerHTML = list
+    .map((item, idx) => {
+      const unit = marketPriceForProduct(marketId, item.product);
+      const subtotal = unit ? unit * item.qty : 0;
+      total += subtotal;
+      const unitLabel = unit ? euros(unit) : "n.d.";
+      const subLabel = unit ? euros(subtotal) : "-";
+      return `<li>
+        <span>${item.product} × ${item.qty} <small class="muted">(${unitLabel}/cad)</small></span>
+        <span>${subLabel} <button data-idx="${idx}" class="remove-btn">Rimuovi</button></span>
+      </li>`;
+    })
+    .join("");
+
+  el.listTotal.textContent = euros(total);
+
+  el.shoppingList.querySelectorAll(".remove-btn").forEach((button) => {
+    button.addEventListener("click", () => {
+      const index = Number(button.dataset.idx);
+      const next = getCurrentList().filter((_, i) => i !== index);
+      setCurrentList(next);
+      renderShoppingList();
+      renderMapSummary();
+    });
+  });
 }
 
-function reveal(card) {
-  const el = cardButton(card.id);
-  el.classList.add("revealed");
-  el.textContent = card.symbol;
+function averageMarketBasket(marketId) {
+  const list = getCurrentList();
+  if (!list.length) return 0;
+  return list.reduce((sum, item) => {
+    const unit = marketPriceForProduct(marketId, item.product) || 0;
+    return sum + unit * item.qty;
+  }, 0);
 }
 
-function hide(card) {
-  const el = cardButton(card.id);
-  el.classList.remove("revealed");
-  el.textContent = "?";
+function distanceKm(lat1, lon1, lat2, lon2) {
+  const toRad = (d) => (d * Math.PI) / 180;
+  const R = 6371;
+  const dLat = toRad(lat2 - lat1);
+  const dLon = toRad(lon2 - lon1);
+  const a =
+    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
+    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
+  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 }
 
-function markMatched(card) {
-  const el = cardButton(card.id);
-  el.classList.add("matched");
-  el.disabled = true;
+function renderMapSummary(userLat = 41.9028, userLon = 12.4964) {
+  const marketWithMetrics = state.db.supermarkets.map((m) => ({
+    ...m,
+    distance: distanceKm(userLat, userLon, m.lat, m.lon),
+    basket: averageMarketBasket(m.id)
+  }));
+
+  const nearest = [...marketWithMetrics].sort((a, b) => a.distance - b.distance)[0];
+  const cheapest = [...marketWithMetrics].sort((a, b) => a.basket - b.basket)[0];
+
+  el.mapSummary.textContent = `Più vicino: ${nearest.name} (${nearest.distance.toFixed(
+    2
+  )} km) · Più economico per la tua lista: ${cheapest.name} (${euros(cheapest.basket)})`;
 }
 
-function onCardClick(id) {
-  if (state.lock) return;
-  const card = state.deck.find(c => c.id === id);
-  if (!card || card.matched) return;
-  if (state.first && state.first.id === card.id) return;
+function setupMap() {
+  if (state.map) return;
+
+  state.map = L.map("map").setView([41.9028, 12.4964], 13);
+  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
+    maxZoom: 19,
+    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
+  }).addTo(state.map);
 
-  reveal(card);
+  state.userMarker = L.marker([41.9028, 12.4964]).addTo(state.map).bindPopup("La tua posizione (default Roma)");
+  state.marketMarkers = state.db.supermarkets.map((market) =>
+    L.marker([market.lat, market.lon]).addTo(state.map).bindPopup(`<strong>${market.name}</strong>`)
+  );
 
-  if (!state.first) {
-    state.first = card;
+  if (navigator.geolocation) {
+    navigator.geolocation.getCurrentPosition(
+      (position) => {
+        const { latitude, longitude } = position.coords;
+        state.userMarker.setLatLng([latitude, longitude]).bindPopup("La tua posizione");
+        state.map.setView([latitude, longitude], 13);
+        renderMapSummary(latitude, longitude);
+      },
+      () => renderMapSummary()
+    );
+  } else {
+    renderMapSummary();
+  }
+}
+
+function realtimeSimulation() {
+  window.setInterval(() => {
+    state.db.supermarkets.forEach((market) => {
+      const prices = state.db.prices[market.id];
+      Object.keys(prices).forEach((product) => {
+        const variance = 1 + (Math.random() * 0.08 - 0.04);
+        prices[product] = Math.max(0.5, Number((prices[product] * variance).toFixed(2)));
+      });
+    });
+    saveDB();
+    renderProducts();
+    renderShoppingList();
+    renderMapSummary();
+  }, 8000);
+}
+
+function onRegister(event) {
+  event.preventDefault();
+  const username = document.getElementById("registerUsername").value.trim();
+  const password = document.getElementById("registerPassword").value;
+  if (state.db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
+    el.authMessage.textContent = "Nome utente già presente.";
+    return;
+  }
+  const user = {
+    id: crypto.randomUUID(),
+    username,
+    passwordHash: hashPassword(password),
+    isAdmin: false
+  };
+  state.db.users.push(user);
+  state.db.shoppingLists[user.id] = [];
+  saveDB();
+  el.authMessage.textContent = "Account creato con successo. Ora effettua il login.";
+  el.registerForm.reset();
+}
+
+function onLogin(event) {
+  event.preventDefault();
+  const username = document.getElementById("loginUsername").value.trim();
+  const password = document.getElementById("loginPassword").value;
+  const user = state.db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
+
+  if (!user || user.passwordHash !== hashPassword(password)) {
+    el.authMessage.textContent = "Credenziali non valide.";
     return;
   }
+  state.session = { userId: user.id };
+  saveSession();
+  el.authMessage.textContent = "";
+  el.loginForm.reset();
+  render();
+}
 
-  state.second = card;
-  state.moves++;
-  state.lock = true;
-
-  if (state.first.symbol === state.second.symbol) {
-    state.first.matched = true;
-    state.second.matched = true;
-    markMatched(state.first);
-    markMatched(state.second);
-    state.matches++;
-    state.score += 10;
-    endTurn();
-    if (state.matches === symbols.length) {
-      messageEl.textContent = `You won! Score: ${state.score} in ${state.moves} moves.`;
-      state.lock = true;
+function onLogout() {
+  state.session = null;
+  saveSession();
+  render();
+}
+
+function onUploadPrice(event) {
+  event.preventDefault();
+  const user = getCurrentUser();
+  if (!user) return;
+
+  const marketId = el.priceMarket.value;
+  const product = el.priceProduct.value.trim();
+  const price = Number(el.priceValue.value);
+  if (!product || !Number.isFinite(price) || price <= 0) return;
+
+  state.db.prices[marketId][product] = Number(price.toFixed(2));
+  const marketName = state.db.supermarkets.find((m) => m.id === marketId)?.name || marketId;
+  state.db.contributions.push({
+    username: user.username,
+    marketId,
+    marketName,
+    product,
+    price: Number(price.toFixed(2)),
+    source: "manual",
+    timestamp: new Date().toISOString()
+  });
+
+  saveDB();
+  el.uploadMessage.textContent = `Prezzo salvato: ${product} a ${euros(price)} in ${marketName}.`;
+  el.priceForm.reset();
+  renderProducts();
+  renderContributions();
+  renderShoppingList();
+  renderMapSummary();
+}
+
+function parseCsvRows(text) {
+  const lines = text
+    .split(/\r?\n/)
+    .map((line) => line.trim())
+    .filter(Boolean);
+  if (!lines.length) return [];
+
+  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
+  return lines.slice(1).map((line) => {
+    const cols = line.split(",").map((c) => c.trim());
+    const row = {};
+    headers.forEach((h, idx) => {
+      row[h] = cols[idx] || "";
+    });
+    return row;
+  });
+}
+
+function normalizeImportRow(row, forcedMarketId) {
+  const marketId = (row.supermarket_id || forcedMarketId || "").trim();
+  const product = (row.product || "").trim();
+  const price = Number(row.price);
+  if (!marketId || !product || !Number.isFinite(price) || price <= 0) return null;
+  if (!state.db.supermarkets.some((m) => m.id === marketId)) return null;
+  return { marketId, product, price: Number(price.toFixed(2)) };
+}
+
+async function onBulkImport(event) {
+  event.preventDefault();
+  const user = getCurrentUser();
+  if (!user?.isAdmin) {
+    el.bulkMessage.textContent = "Import non consentito: solo admin.";
+    return;
+  }
+
+  const file = el.bulkFile.files?.[0];
+  if (!file) return;
+
+  const mode = el.bulkMode.value;
+  const selectedMarket = el.bulkMarket.value;
+  let rows = [];
+
+  try {
+    if (file.name.toLowerCase().endsWith(".csv")) {
+      rows = parseCsvRows(await file.text());
     } else {
-      messageEl.textContent = "Good match!";
+      const data = await file.arrayBuffer();
+      const wb = XLSX.read(data, { type: "array" });
+      const ws = wb.Sheets[wb.SheetNames[0]];
+      rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
+      rows = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).toLowerCase(), String(v)])));
+    }
+
+    if (mode === "replace") {
+      state.db.prices[selectedMarket] = {};
     }
-    updateStats();
+
+    let imported = 0;
+    rows.forEach((raw) => {
+      const normalized = normalizeImportRow(raw, selectedMarket);
+      if (!normalized) return;
+
+      state.db.prices[normalized.marketId][normalized.product] = normalized.price;
+      const marketName = state.db.supermarkets.find((m) => m.id === normalized.marketId)?.name || normalized.marketId;
+      state.db.contributions.push({
+        username: user.username,
+        marketId: normalized.marketId,
+        marketName,
+        product: normalized.product,
+        price: normalized.price,
+        source: "bulk",
+        timestamp: new Date().toISOString()
+      });
+      imported += 1;
+    });
+
+    saveDB();
+    el.bulkMessage.textContent = `Import completato: ${imported} righe valide processate.`;
+    el.bulkImportForm.reset();
+    fillMarketSelectors();
+    renderProducts();
+    renderContributions();
+    renderShoppingList();
+    renderMapSummary();
+  } catch (error) {
+    el.bulkMessage.textContent = `Errore import: ${error.message}`;
+  }
+}
+
+function onAddListItem(event) {
+  event.preventDefault();
+  const product = el.listProduct.value.trim();
+  const qty = Number(el.listQty.value);
+  if (!product || !Number.isFinite(qty) || qty < 1) return;
+
+  const list = getCurrentList();
+  const existing = list.find((i) => i.product.toLowerCase() === product.toLowerCase());
+  if (existing) {
+    existing.qty += qty;
   } else {
-    state.score = Math.max(0, state.score - 2);
-    updateStats();
-    messageEl.textContent = "No match, try again!";
-    setTimeout(() => {
-      hide(state.first);
-      hide(state.second);
-      endTurn();
-    }, 700);
+    list.push({ product, qty });
   }
+  setCurrentList(list);
+  el.listForm.reset();
+  el.listQty.value = "1";
+  renderShoppingList();
+  renderMapSummary();
 }
 
-function endTurn() {
-  state.first = null;
-  state.second = null;
-  state.lock = false;
+function renderSession() {
+  const user = getCurrentUser();
+  if (user) {
+    el.sessionState.textContent = `Connesso come ${user.username}${user.isAdmin ? " (admin)" : ""}`;
+    el.logoutBtn.classList.remove("hidden");
+    el.authSection.classList.add("hidden");
+    el.appSection.classList.remove("hidden");
+    el.adminSection.classList.toggle("hidden", !user.isAdmin);
+  } else {
+    el.sessionState.textContent = "Utente non autenticato";
+    el.logoutBtn.classList.add("hidden");
+    el.authSection.classList.remove("hidden");
+    el.appSection.classList.add("hidden");
+    el.adminSection.classList.add("hidden");
+  }
 }
 
-restartBtn.addEventListener("click", setupGame);
-setupGame();
+function render() {
+  renderSession();
+  if (!getCurrentUser()) return;
+  fillMarketSelectors();
+  renderProducts();
+  renderContributions();
+  renderShoppingList();
+  setupMap();
+  renderMapSummary();
+}
+
+el.registerForm.addEventListener("submit", onRegister);
+el.loginForm.addEventListener("submit", onLogin);
+el.logoutBtn.addEventListener("click", onLogout);
+el.priceForm.addEventListener("submit", onUploadPrice);
+el.listForm.addEventListener("submit", onAddListItem);
+el.bulkImportForm.addEventListener("submit", onBulkImport);
+el.marketFilter.addEventListener("change", renderProducts);
+el.searchInput.addEventListener("input", renderProducts);
+el.listMarket.addEventListener("change", () => {
+  renderShoppingList();
+  renderMapSummary();
+});
+
+loadState();
+render();
+realtimeSimulation();
