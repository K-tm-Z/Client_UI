import { useState, useRef, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from "recharts";
import "./Dashboard.css";

// ─── Inventory Tab ────────────────────────────────────────────────────────────
function InventoryTab() {
  const [barcode, setBarcode]       = useState("");
  const [itemName, setItemName]     = useState("");
  const [quantity, setQuantity]     = useState("");
  const [expiry, setExpiry]         = useState("");
  const [entries, setEntries]       = useState([
    { id: 1, barcode: "123456789", itemName: "Burger Patties",   quantity: 48, expiry: "2026-02-25", scannedAt: "2/18/2026, 8:02:00 AM",  expiryStatus: "ok"      },
    { id: 2, barcode: "987654321", itemName: "Buns (Pack)",       quantity: 30, expiry: "2026-02-21", scannedAt: "2/18/2026, 8:05:00 AM",  expiryStatus: "soon"    },
    { id: 3, barcode: "777888999", itemName: "Fries (Frozen)",    quantity: 60, expiry: "2026-05-10", scannedAt: "2/18/2026, 8:10:00 AM",  expiryStatus: "ok"      },
    { id: 4, barcode: "444555666", itemName: "Cheddar Slices",    quantity: 24, expiry: "2026-02-19", scannedAt: "2/18/2026, 8:14:00 AM",  expiryStatus: "soon"    },
    { id: 5, barcode: "333444555", itemName: "Pizza Dough",       quantity: 12, expiry: "2026-02-15", scannedAt: "2/18/2026, 8:20:00 AM",  expiryStatus: "expired" },
    { id: 6, barcode: "000111222", itemName: "Sushi Rice",        quantity: 20, expiry: "2026-03-30", scannedAt: "2/18/2026, 8:25:00 AM",  expiryStatus: "ok"      },
    { id: 7, barcode: "666777888", itemName: "Tomato Sauce",      quantity: 15, expiry: "2026-04-01", scannedAt: "2/18/2026, 8:30:00 AM",  expiryStatus: "ok"      },
    { id: 8, barcode: "111222333", itemName: "Shredded Lettuce",  quantity: 10, expiry: "2026-02-20", scannedAt: "2/18/2026, 8:35:00 AM",  expiryStatus: "soon"    },
  ]);
  const [flash, setFlash]           = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [camError, setCamError]     = useState("");
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const barcodeInputRef = useRef(null);

  useEffect(() => { barcodeInputRef.current?.focus(); }, []);

  const MOCK_ITEMS = {
    "123456789": "Burger Patties",
    "987654321": "Buns (Pack)",
    "111222333": "Shredded Lettuce",
    "444555666": "Cheddar Slices",
    "777888999": "Fries (Frozen)",
    "000111222": "Sushi Rice",
    "333444555": "Pizza Dough",
    "666777888": "Tomato Sauce",
  };

  function handleBarcodeChange(val) {
    setBarcode(val);
    if (MOCK_ITEMS[val]) setItemName(MOCK_ITEMS[val]);
    else setItemName((prev) => (Object.values(MOCK_ITEMS).includes(prev) ? "" : prev));
  }

  function isFormValid() {
    return barcode.trim() && itemName.trim() && quantity && Number(quantity) > 0 && expiry;
  }

  function getExpiryStatus(dateStr) {
    const today = new Date();
    const exp   = new Date(dateStr);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0)  return "expired";
    if (diffDays <= 3) return "soon";
    return "ok";
  }

  function submitEntry(e) {
    e?.preventDefault();
    if (!isFormValid()) return;

    const now = new Date();
    const newEntry = {
      id: Date.now(),
      barcode: barcode.trim(),
      itemName: itemName.trim(),
      quantity: Number(quantity),
      expiry,
      scannedAt: now.toLocaleString("en-CA", { hour12: true }),
      expiryStatus: getExpiryStatus(expiry),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
    setBarcode(""); setItemName(""); setQuantity(""); setExpiry("");
    barcodeInputRef.current?.focus();
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function openCamera() {
    setCamError(""); setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setCamError("Camera access denied or unavailable."); }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false); setCamError("");
  }

  function simulateCameraScan() {
    const codes = Object.keys(MOCK_ITEMS);
    const code  = codes[Math.floor(Math.random() * codes.length)];
    handleBarcodeChange(code);
    closeCamera();
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }

  const expiryLabel = { ok: "✓ Good", soon: "⚠ Expiring Soon", expired: "✕ Expired" };
  const expiryClass = { ok: "tag-ok", soon: "tag-warn", expired: "tag-err" };

  return (
    <div className="inv-layout">
      {/* ── LEFT: Scan form ── */}
      <div className="inv-form-panel">
        <div className="inv-form-title">📦 Add to Inventory</div>
        <div className="inv-form-sub muted">Scan a barcode or type it manually</div>

        <form className="inv-form" onSubmit={submitEntry}>
          <div className="inv-field">
            <label className="inv-label">Barcode</label>
            <div className="inv-barcode-row">
              <input
                ref={barcodeInputRef}
                className="inv-input"
                placeholder="Scan or type barcode…"
                value={barcode}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
              <button type="button" className="inv-cam-btn" onClick={cameraOpen ? closeCamera : openCamera} title="Use camera">
                📷
              </button>
            </div>
          </div>

          {cameraOpen && (
            <div className="inv-camera-box">
              {camError ? (
                <div className="inv-cam-error muted">{camError}</div>
              ) : (
                <>
                  <video ref={videoRef} className="inv-video" autoPlay playsInline muted />
                  <div className="inv-cam-overlay"><div className="inv-scan-line" /></div>
                  <button type="button" className="inv-sim-btn" onClick={simulateCameraScan}>Simulate Scan</button>
                </>
              )}
              <button type="button" className="inv-close-cam muted" onClick={closeCamera}>✕ Close camera</button>
            </div>
          )}

          <div className="inv-field">
            <label className="inv-label">Item Name</label>
            <input className="inv-input" placeholder="e.g. Burger Patties" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>

          <div className="inv-row2">
            <div className="inv-field">
              <label className="inv-label">Quantity Added</label>
              <input className="inv-input" type="number" min="1" placeholder="e.g. 24" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="inv-field">
              <label className="inv-label">Expiry Date</label>
              <input className="inv-input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          </div>

          <button className={`inv-submit-btn ${flash ? "is-flash" : ""}`} type="submit" disabled={!isFormValid()}>
            {flash ? "✓ Added!" : "Add to Inventory"}
          </button>
        </form>
      </div>

      {/* ── RIGHT: Live log ── */}
      <div className="inv-log-panel">
        <div className="inv-log-header">
          <div className="inv-log-title">Live Inventory Log</div>
          <div className="inv-log-count muted">{entries.length} item{entries.length !== 1 ? "s" : ""} added</div>
        </div>

        {entries.length === 0 ? (
          <div className="inv-empty">
            <div className="inv-empty-icon">📋</div>
            <div className="muted">No items scanned yet. Add your first item on the left.</div>
          </div>
        ) : (
          <div className="inv-entries">
            {entries.map((entry) => (
              <div key={entry.id} className={`inv-entry ${entry.expiryStatus === "expired" ? "entry-expired" : entry.expiryStatus === "soon" ? "entry-warn" : ""}`}>
                <div className="inv-entry-top">
                  <div className="inv-entry-name">{entry.itemName}</div>
                  <span className={`inv-tag ${expiryClass[entry.expiryStatus]}`}>{expiryLabel[entry.expiryStatus]}</span>
                </div>
                <div className="inv-entry-meta">
                  <span>🔢 {entry.barcode}</span>
                  <span>📦 Qty: <strong>{entry.quantity}</strong></span>
                  <span>📅 Exp: <strong>{entry.expiry}</strong></span>
                </div>
                <div className="inv-entry-footer">
                  <span className="muted inv-entry-time">⏱ {entry.scannedAt}</span>
                  <button className="inv-remove-btn" type="button" onClick={() => removeEntry(entry.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const kpis = [
    { label: "Orders Today",  value: "128"       },
    { label: "Revenue Today", value: "$1,024.50"  },
    { label: "Avg Cook Time", value: "3m 12s"    },
    { label: "Error Rate",    value: "1.6%"       },
  ];
  const salesByHour = [
    { hour: "10", sales: 12 }, { hour: "11", sales: 18 }, { hour: "12", sales: 35 },
    { hour: "13", sales: 28 }, { hour: "14", sales: 22 }, { hour: "15", sales: 30 },
  ];
  const cookErrors = [
    { day: "Mon", errors: 1 }, { day: "Tue", errors: 0 }, { day: "Wed", errors: 2 },
    { day: "Thu", errors: 1 }, { day: "Fri", errors: 3 }, { day: "Sat", errors: 1 }, { day: "Sun", errors: 0 },
  ];
  const machineStates = [
    { name: "Idle", value: 42 }, { name: "Cooking", value: 48 },
    { name: "Cleaning", value: 7 }, { name: "Error", value: 3 },
  ];
  const pieColors = ["#6aa6ff", "#6dffb5", "#ffd36a", "#ff6a6a"];

  return (
    <>
      <div className="maint-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="maint-kpi">
            <div className="maint-kpi-label">{k.label}</div>
            <div className="maint-kpi-value">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="maint-grid">
        <div className="maint-card">
          <h3>Sales / Hour</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByHour}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Bar dataKey="sales" fill="#6aa6ff" /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="maint-card">
          <h3>Cook Errors (weekly)</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cookErrors}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="errors" dot /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="maint-card maint-wide">
          <h3>Machine State Distribution</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Tooltip /><Legend /><Pie data={machineStates} dataKey="value" nameKey="name" outerRadius={90} label>{machineStates.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}</Pie></PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="maint-card maint-wide">
          <h3>Recent Execution Logs (mock)</h3>
          <div className="maint-logs">
            <div className="maint-log"><span className="muted">12:02</span> • Order #1042 • Burger • OK • 3m 01s</div>
            <div className="maint-log"><span className="muted">12:08</span> • Order #1043 • Fries • OK • 2m 12s</div>
            <div className="maint-log warn"><span className="muted">12:13</span> • Order #1044 • Pizza • TEMP deviation • recovered</div>
            <div className="maint-log err"><span className="muted">12:20</span> • Order #1045 • Sushi • ERROR boundary • aborted</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function MaintenanceDashboard({ onExit }) {
  const [tab, setTab] = useState("inventory");

  return (
    <div className="maint-shell">
      <div className="maint-header">
        <div>
          <h2 className="maint-title">Maintenance</h2>
          <div className="maint-subtitle">Inventory check-in • machine health • sales summary</div>
        </div>
      </div>

      <div className="maint-tabs">
        <button type="button" className={`maint-tab ${tab === "inventory" ? "is-active" : ""}`} onClick={() => setTab("inventory")}>
          📦 Inventory
        </button>
        <button type="button" className={`maint-tab ${tab === "dashboard" ? "is-active" : ""}`} onClick={() => setTab("dashboard")}>
          📊 Dashboard
        </button>
      </div>

      {tab === "inventory" ? <InventoryTab /> : <DashboardTab />}
    </div>
  );
}