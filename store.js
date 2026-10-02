/* store.js: the "ledger" behind every screen of the pharmacy stock tracker.

   Think of it as the pharmacy's notebook. We never write "Paracetamol: 420".
   We only ever ADD LINES to the notebook (received 1000, dispensed 80, ...)
   and work out the balance by adding the lines up. That is a bin card.
   Because lines are never edited or deleted, the balance cannot drift away
   from the history.

   Every screen (Dashboard, Receive, Dispense, Inventory, Bin Card) talks to
   this one file, so they can never disagree with each other.

   Use it in HTML with:  <script src="store.js"></script>
   Then call:            store.dispenseStock({...})   etc.
*/

const store = (function () {
  "use strict";

  const STORAGE_KEY = "pharmatrack_demo_v1";

  // The demo "today". Set to null to use the real date instead.
  const DEMO_TODAY = null;

  let state = null;

  // ---------- small helpers ----------

  function today() {
    return DEMO_TODAY || new Date().toISOString().slice(0, 10);
  }

  function daysBetween(fromISO, toISO) {
    return Math.round((new Date(toISO) - new Date(fromISO)) / 86400000);
  }

  function addDays(iso, days) {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // Browser storage (localStorage). Wrapped in try/catch so it never crashes.
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function nextId() {
    return state.movements.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  }

  // Adds ONE line to the notebook (a "movement").
  // type is "received", "dispensed" or "adjustment".
  function addMovement(m) {
    state.movements.push({
      id: nextId(),
      date: m.date || today(),
      itemId: m.itemId,
      type: m.type,
      qtyIn: m.qtyIn || 0,
      qtyOut: m.qtyOut || 0,
      batch: m.batch,
      expiry: m.expiry,
      party: m.party || "",          // supplier or recipient
      reference: m.reference || "",  // GRN number, prescription number, requisition...
      user: m.user || state.currentUser
    });
  }

  // ---------- sample data (matches the mockups) ----------

  function seedData() {
    const users = [
      "S. Jenkins, Pharmacist",
      "A. Patel, Pharmacist",
      "M. Davis, Dispenser",
      "K. Mensah, Dispenser"
    ];

    const items = [
      { id: "PCM500",  name: "Paracetamol 500mg tablets",      unit: "tabs",    minLevel: 500, costPrice: 0.25, sellingPrice: 0.40 },
      { id: "AMX250",  name: "Amoxicillin 250mg capsules",     unit: "caps",    minLevel: 400, costPrice: 0.85, sellingPrice: 1.30 },
      { id: "MET500",  name: "Metformin 500mg tablets",        unit: "tabs",    minLevel: 300, costPrice: 0.30, sellingPrice: 0.55 },
      { id: "OME20",   name: "Omeprazole 20mg capsules",       unit: "caps",    minLevel: 200, costPrice: 0.60, sellingPrice: 1.10 },
      { id: "IBU400",  name: "Ibuprofen 400mg tablets",        unit: "tabs",    minLevel: 350, costPrice: 0.20, sellingPrice: 0.35 },
      { id: "ORS",     name: "Oral Rehydration Salts",         unit: "sachets", minLevel: 100, costPrice: 1.10, sellingPrice: 1.80 },
      { id: "AL20120", name: "Artemether/Lumefantrine 20/120", unit: "tabs",    minLevel: 100, costPrice: 4.50, sellingPrice: 7.00 },
      { id: "CIP500",  name: "Ciprofloxacin 500mg tablets",    unit: "tabs",    minLevel: 60,  costPrice: 1.20, sellingPrice: 2.00 },
      { id: "ZNC20",   name: "Zinc Sulfate 20mg dispersible tablets", unit: "tabs", minLevel: 50, costPrice: 0.15, sellingPrice: 0.30 },
      { id: "CXM500",  name: "Cefuroxime 500mg tablets",       unit: "tabs",    minLevel: 40,  costPrice: 3.20, sellingPrice: 5.00 },
      { id: "AML5",    name: "Amlodipine 5mg tablets",         unit: "tabs",    minLevel: 200, costPrice: 0.35, sellingPrice: 0.60 },
      { id: "LOR10",   name: "Loratadine 10mg tablets",        unit: "tabs",    minLevel: 150, costPrice: 0.40, sellingPrice: 0.70 }
    ];

    // Build the starting notebook lines.
    state = { currentUser: users[0], users: users, items: items, movements: [] };

    function rec(date, itemId, qty, batch, expiry, supplier, ref, user) {
      addMovement({ date, itemId, type: "received", qtyIn: qty, batch, expiry, party: supplier, reference: ref, user });
    }
    function disp(date, itemId, qty, batch, expiry, recipient, ref, user) {
      addMovement({ date, itemId, type: "dispensed", qtyOut: qty, batch, expiry, party: recipient, reference: ref, user });
    }

    const SUP = "PrimeCare Wholesale Ltd";

    // Paracetamol has a full history so the bin card looks real.
    rec ("2026-09-05", "PCM500", 1000, "PRC-26H14", "2026-11-15", SUP, "GRN-0905", users[1]);
    disp("2026-09-10", "PCM500", 80,  "PRC-26H14", "2026-11-15", "Ward 3 Internal Requisition", "W3-8820", users[0]);
    rec ("2026-09-14", "PCM500", 200, "PRC-26K02", "2027-08-31", SUP, "GRN-0914", users[1]);
    disp("2026-09-18", "PCM500", 120, "PRC-26H14", "2026-11-15", "Outpatient Dispensary", "OPD-1042", users[2]);
    disp("2026-09-21", "PCM500", 120, "PRC-26H14", "2026-11-15", "Emergency Tray Restock", "ER-CART", users[0]);
    disp("2026-09-25", "PCM500", 200, "PRC-26H14", "2026-11-15", "Adult Medical Ward Requisition", "AMW-441", users[1]);
    disp("2026-09-28", "PCM500", 100, "PRC-26H14", "2026-11-15", "Community Prescription", "RX-7731", users[2]);
    disp("2026-09-30", "PCM500", 60,  "PRC-26H14", "2026-11-15", "Ward 3 Clinic Transfer", "W3-902", users[0]);
    disp("2026-10-01", "PCM500", 100, "PRC-26H14", "2026-11-15", "Outpatient Dispensary", "OPD-1098", users[0]);

    // Other items: one delivery each (Amoxicillin has two batches).
    const d = "2026-08-20";
    rec(d, "AMX250",  120, "AMX-26G11", "2026-12-24", SUP, "GRN-0820", users[1]);
    rec(d, "AMX250",   60, "AMX-27A03", "2027-06-30", SUP, "GRN-0820", users[1]);
    rec(d, "MET500",  150, "MET-26C07", "2027-03-14", SUP, "GRN-0820", users[1]);
    rec(d, "OME20",    90, "OME-26D11", "2027-05-20", SUP, "GRN-0820", users[1]);
    rec(d, "IBU400",  180, "IBU-26B05", "2027-02-10", SUP, "GRN-0820", users[1]);
    rec("2026-03-10", "IBU400", 30, "IBU-25L02", "2026-09-15", SUP, "GRN-0310", users[1]); // already expired
    rec(d, "ORS",      45, "ORS-26E02", "2027-06-30", SUP, "GRN-0820", users[1]);
    rec(d, "AL20120", 140, "AL-26F02",  "2026-11-28", SUP, "GRN-0820", users[1]);
    rec(d, "CIP500",   85, "CIP-26D19", "2026-12-12", SUP, "GRN-0820", users[1]);
    rec(d, "AML5",    600, "AML-26H09", "2027-09-05", SUP, "GRN-0820", users[1]);
    rec(d, "LOR10",   320, "LOR-26G04", "2027-08-18", SUP, "GRN-0820", users[1]);
    // Zinc and Cefuroxime have no lines yet, so they show as out of stock.

    save();
  }

  // ---------- reading data (no changes made) ----------

  function getItem(itemId) {
    return state.items.find(i => i.id === itemId) || null;
  }

  // Balance = every "in" minus every "out".
  function getBalance(itemId) {
    return state.movements
      .filter(m => m.itemId === itemId)
      .reduce((sum, m) => sum + m.qtyIn - m.qtyOut, 0);
  }

  // Batches that still have stock, earliest expiry first (FEFO order).
  function getBatches(itemId) {
    const map = {};
    state.movements.filter(m => m.itemId === itemId).forEach(m => {
      if (!map[m.batch]) map[m.batch] = { batch: m.batch, expiry: m.expiry, qty: 0 };
      map[m.batch].qty += m.qtyIn - m.qtyOut;
    });
    return Object.values(map)
      .filter(b => b.qty > 0)
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
  }

  // The bin card: every line for one item, oldest first, with a running balance.
  // Note: no prices here. Prices live on the item, not the card.
  function getBinCard(itemId) {
    let running = 0;
    return state.movements
      .filter(m => m.itemId === itemId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .map(m => {
        running += m.qtyIn - m.qtyOut;
        return Object.assign({}, m, { balance: running });
      });
  }

  // Inventory screen: every item with its balance, earliest expiry and status.
  function getInventory() {
    const soonCutoff = addDays(today(), 90);
    return state.items.map(item => {
      const balance = getBalance(item.id);
      const batches = getBatches(item.id);
      const earliestExpiry = batches.length ? batches[0].expiry : null;
      const expiredQty = batches.filter(b => b.expiry < today()).reduce((s, b) => s + b.qty, 0);
      const usable = balance - expiredQty; // expired stock can't be dispensed, so it doesn't count
      const statuses = [];
      if (usable === 0) statuses.push("out");
      else if (usable < item.minLevel) statuses.push("low");
      if (batches.some(b => b.expiry >= today() && b.expiry <= soonCutoff)) statuses.push("expiring");
      if (expiredQty > 0) statuses.push("expired");
      if (statuses.length === 0) statuses.push("ok");
      return Object.assign({}, item, { balance, earliestExpiry, expiredQty, statuses });
    });
  }

  // Dashboard numbers.
  function getDashboard(days) {
    days = days || 90;
    const cutoff = addDays(today(), days);
    const inv = getInventory();

    const lowStock = inv.filter(i => i.statuses.includes("low"));
    const outOfStock = inv.filter(i => i.statuses.includes("out"));

    const expiringSoon = [], expired = [];
    state.items.forEach(item => {
      getBatches(item.id).forEach(b => {
        if (b.expiry <= cutoff) {
          (b.expiry < today() ? expired : expiringSoon).push({
            itemId: item.id, itemName: item.name, batch: b.batch,
            expiry: b.expiry, qty: b.qty, unit: item.unit,
            daysLeft: daysBetween(today(), b.expiry),
            valueAtCost: b.qty * item.costPrice
          });
        }
      });
    });
    expiringSoon.sort((a, b) => a.expiry.localeCompare(b.expiry));

    return {
      lowStock: lowStock,
      outOfStock: outOfStock,
      expiringSoon: expiringSoon,
      expiringValue: expiringSoon.reduce((s, b) => s + b.valueAtCost, 0),
      expired: expired,
      expiredValue: expired.reduce((s, b) => s + b.valueAtCost, 0)
    };
  }

  // Total value of everything on the shelf at cost price.
  function getStockValue() {
    return state.items.reduce((sum, i) => sum + getBalance(i.id) * i.costPrice, 0);
  }

  // ---------- changing data (adds lines, never edits old ones) ----------

  // Receive screen. Every field is required.
  function receiveStock(f) {
    const errors = [];
    const item = getItem(f.itemId);
    if (!item) errors.push("Choose an item.");
    if (!f.supplier) errors.push("Supplier is required.");
    if (!f.batch) errors.push("Batch number is required.");
    if (!f.expiry) errors.push("Expiry date is required.");
    else if (f.expiry <= today()) errors.push("Expiry date must be in the future.");
    if (!Number.isInteger(f.qty) || f.qty <= 0) errors.push("Quantity must be a whole number above zero.");
    if (!(f.costPrice >= 0)) errors.push("Cost price is required.");
    if (!(f.sellingPrice >= 0)) errors.push("Selling price is required.");

    // Same batch code must always have the same expiry date.
    if (item && f.batch && f.expiry) {
      const clash = state.movements.find(m => m.itemId === f.itemId && m.batch === f.batch && m.expiry !== f.expiry);
      if (clash) errors.push("Batch " + f.batch + " already exists with a different expiry date.");
    }
    if (errors.length) return { ok: false, errors: errors };

    addMovement({
      itemId: f.itemId, type: "received", qtyIn: f.qty,
      batch: f.batch, expiry: f.expiry, party: f.supplier, reference: f.reference || ""
    });
    item.costPrice = f.costPrice;
    item.sellingPrice = f.sellingPrice;
    save();
    return { ok: true };
  }

  // Dispense screen. Earliest-expiry batch goes first (FEFO).
  // You can sell down to zero, but never below, and never from an expired batch.
  function dispenseStock(f) {
    const errors = [];
    const item = getItem(f.itemId);
    if (!item) errors.push("Choose an item.");
    if (!Number.isInteger(f.qty) || f.qty <= 0) errors.push("Quantity must be a whole number above zero.");
    if (!f.reference) errors.push("A prescription number or requisition reference is required.");
    if (errors.length) return { ok: false, errors: errors };

    const usable = getBatches(f.itemId).filter(b => b.expiry >= today());
    const available = usable.reduce((s, b) => s + b.qty, 0);
    if (f.qty > available) {
      return {
        ok: false,
        errors: ["Cannot dispense " + f.qty + " " + item.unit + ". Only " + available + " available."],
        available: available
      };
    }

    let remaining = f.qty;
    const allocations = [];
    for (const b of usable) {
      if (remaining <= 0) break;
      const take = Math.min(b.qty, remaining);
      addMovement({
        itemId: f.itemId, type: "dispensed", qtyOut: take,
        batch: b.batch, expiry: b.expiry, party: f.recipient || "", reference: f.reference
      });
      allocations.push({ batch: b.batch, expiry: b.expiry, qty: take });
      remaining -= take;
    }
    save();
    return { ok: true, allocations: allocations };
  }

  // "Add new item" button on the Inventory screen.
  function addItem(f) {
    const errors = [];
    if (!f.name) errors.push("Item name is required.");
    if (!f.unit) errors.push("Unit is required (tabs, caps, sachets...).");
    if (!(f.minLevel >= 0)) errors.push("Minimum level is required.");
    if (errors.length) return { ok: false, errors: errors };
    const id = "ITEM" + (state.items.length + 1) + "-" + Date.now() % 100000;
    state.items.push({
      id: id, name: f.name, unit: f.unit, minLevel: f.minLevel,
      costPrice: f.costPrice || 0, sellingPrice: f.sellingPrice || 0
    });
    save();
    return { ok: true, id: id };
  }

  // Edit an item's details (name, unit, minimum level, prices). Bin card history is untouched.
  function updateItem(itemId, f) {
    const item = getItem(itemId);
    if (!item) return { ok: false, errors: ["Item not found."] };
    const errors = [];
    if (!f.name) errors.push("Item name is required.");
    if (!f.unit) errors.push("Unit is required.");
    if (!(f.minLevel >= 0)) errors.push("Minimum level is required.");
    if (!(f.costPrice >= 0) || !(f.sellingPrice >= 0)) errors.push("Prices must be zero or more.");
    if (errors.length) return { ok: false, errors: errors };
    Object.assign(item, { name: f.name, unit: f.unit, minLevel: f.minLevel, costPrice: f.costPrice, sellingPrice: f.sellingPrice });
    save();
    return { ok: true };
  }

  // Delete an item only if it has no bin card history (history is the audit trail).
  function deleteItem(itemId) {
    if (state.movements.some(m => m.itemId === itemId)) {
      return { ok: false, errors: ["This item has bin card history, so it can't be deleted. History is kept as the audit trail."] };
    }
    state.items = state.items.filter(i => i.id !== itemId);
    save();
    return { ok: true };
  }

  // Remove an expired batch from stock. Adds an "adjustment" line with a reason; nothing is erased.
  function writeOffBatch(itemId, batch, reason) {
    const b = getBatches(itemId).find(x => x.batch === batch);
    if (!b) return { ok: false, errors: ["Batch not found or already empty."] };
    if (b.expiry >= today()) return { ok: false, errors: ["Only expired batches can be written off."] };
    addMovement({ itemId: itemId, type: "adjustment", qtyOut: b.qty, batch: b.batch, expiry: b.expiry, party: "Expired stock write-off", reference: reason || "Expired" });
    save();
    return { ok: true, qty: b.qty };
  }

  // ---------- users ("Using as" dropdown) ----------

  function getUsers() { return state.users.slice(); }
  function getCurrentUser() { return state.currentUser; }
  function setCurrentUser(name) {
    if (state.users.includes(name)) { state.currentUser = name; save(); }
  }

  // Wipe everything and go back to the sample data (handy before a demo).
  function reset() { seedData(); }

  // ---------- start up ----------
  state = load();
  if (!state) seedData();

  return {
    today, getItem, getBalance, getBatches, getBinCard, getInventory,
    getDashboard, getStockValue, receiveStock, dispenseStock, addItem, updateItem, deleteItem, writeOffBatch,
    getUsers, getCurrentUser, setCurrentUser, reset
  };
})();

// Lets us test the file in Node. Ignored in the browser.
if (typeof module !== "undefined" && module.exports) module.exports = store;
