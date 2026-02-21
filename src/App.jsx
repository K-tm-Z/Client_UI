import { useState, useEffect, useMemo, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { N } from "./util/N";
import { currentTime } from "./util/currentTime";
import { createPortal } from "react-dom";
import { MaintenanceDashboard } from "./Dashboard";
import "./App.css";

import burger from "./assets/burger.jpg";
import fries from "./assets/fries.jpg";
import salad from "./assets/salad.webp";
import pizza from "./assets/Cheese-Pizza.jpg";
import sushi from "./assets/sushi.jpg";

const MAINT_PIN = "1234";
const IDLE_MS = 60_000; // change to whatever you want

function App() {
  function useCurrentDate() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
    return now;
  }

  const INITIAL_ITEMS = [
    { id: "burger", name: "Burger", price: 8.99, img: burger, available: true },
    { id: "fries", name: "Fries", price: 3.49, img: fries, available: true },
    { id: "salad", name: "Salad", price: 6.25, img: salad, available: true },
    { id: "pizza", name: "Pizza", price: 10.5, img: pizza, available: true },
    { id: "sushi", name: "Sushi", price: 12.75, img: sushi, available: true },
  ];

  const [items] = useState(INITIAL_ITEMS);

  // "view router"
  const [view, setView] = useState("kiosk"); // "kiosk" | "maintenance"

  // lockscreen states
  const [locked, setLocked] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // maintenance PIN modal states
  const [pin, setPin] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState(false);

  // cart
  const [cart, setCart] = useState({});
  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const total = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.price * line.qty, 0),
    [cartLines]
  );
    function formatMoney(n) {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  }

  function addToCart(item) {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev[item.id];
      const nextQty = existing ? existing.qty + 1 : 1;
      return {
        ...prev,
        [item.id]: { id: item.id, name: item.name, price: item.price, qty: nextQty },
      };
    });
  }

  function inc(itemId) {
    setCart((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], qty: prev[itemId].qty + 1 },
    }));
  }

  function dec(itemId) {
    setCart((prev) => {
      const line = prev[itemId];
      const nextQty = line.qty - 1;
      if (nextQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { ...line, qty: nextQty } };
    });
  }

  function remove(itemId) {
    setCart((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  }



  // Math util for demo
  const now = useCurrentDate();
  const [temperature] = useState(() => N.rand(65, 85));

  // Extras page
  const EXTRAS_OPTIONS = [
    { id: "ketchup",   label: "Ketchup",       emoji: "🍅", group: "Condiments" },
    { id: "mustard",   label: "Mustard",        emoji: "💛", group: "Condiments" },
    { id: "mayo",      label: "Mayo",           emoji: "🥚", group: "Condiments" },
    { id: "saltpepper",label: "Salt & Pepper",  emoji: "🧂", group: "Condiments" },
    { id: "napkins",   label: "Napkins",        emoji: "🧻", group: "Utensils"   },
    { id: "fork",      label: "Fork",           emoji: "🍴", group: "Utensils"   },
    { id: "knife",     label: "Knife",          emoji: "🔪", group: "Utensils"   },
    { id: "spoon",     label: "Spoon",          emoji: "🥄", group: "Utensils"   },
  ];
  const [selectedExtras, setSelectedExtras] = useState([]);

  function toggleExtra(id) {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function goToExtras() {
    if (cartLines.length === 0) return;
    setSelectedExtras([]);
    setView("extras");
  }

  function finishExtrasAndConfirm(skipExtras = false) {
    const code = makeOrderCode();
    const url = `https://example.com/orders/${encodeURIComponent(code)}`;
    const extrasList = skipExtras ? [] : EXTRAS_OPTIONS.filter((o) => selectedExtras.includes(o.id));
    setReceipt({
      code,
      total,
      lines: cartLines,
      extras: extrasList,
      url,
      uiExpiresAt: Date.now() + CONFIRM_MS,
      cookEndsAt: Date.now() + COOK_TIME_MS,
    });
    setCart({});
    setView("confirm");
  }

  // Confirmation screen
  const CONFIRM_MS = 12_000; // how long the confirmation screen stays up
  const COOK_TIME_MS = 300_000; // mock cook time for order tracking
  const [receipt, setReceipt] = useState(null);
  const [confirmRemainingMs, setConfirmRemainingMs] = useState(CONFIRM_MS);
  const [cookRemainingMs, setCookRemainingMs] = useState(COOK_TIME_MS);

  useEffect(() => {
    if (view !== "confirm" || !receipt) return;
    // 1) Hidden auto-return timer (no UI)
    const hideId = window.setTimeout(() => {
      setReceipt(null);
      setView("kiosk");
    }, Math.max(0, receipt.uiExpiresAt - Date.now()));

    // 2) Visible cooking progress ticker (updates bar)
    const tick = () => {
      const remaining = Math.max(0, receipt.cookEndsAt - Date.now());
      setCookRemainingMs(remaining);
    };

    tick();
    const cookId = window.setInterval(tick, 200);
    return () => {
      window.clearInterval(cookId);
      window.clearTimeout(hideId);
    };
  }, [view, receipt]);

  function makeOrderCode() {
    // Example: "K7Q4-9X2P"
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${a}-${b}`;
  }

  // ----- smooth unlock animation -----
  function startUnlock() {
    setIsUnlocking(true);
    window.setTimeout(() => {
      setLocked(false);
      setIsUnlocking(false);
    }, 350); // match your CSS transition duration
  }

  // ----- idle timeout: auto return to lockscreen -----
  const idleTimerRef = useRef(null);

  function lockNow() {
    setView("kiosk");     // always return kiosk
    setPinOpen(false);
    setPin("");
    setPinError(false);
    setCart({});          // optional: clear cart on lock
    setLocked(true);
  }

  function resetIdleTimer() {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      lockNow();
    }, IDLE_MS);
  }

  useEffect(() => {
    if (locked) return; // don’t run idle timer while locked

    resetIdleTimer();

    const onActivity = () => resetIdleTimer();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("mousemove", onActivity);

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("mousemove", onActivity);
    };
  }, [locked]);

  // ----- maintenance PIN flow -----
  function openMaintenancePin() {
    setPinOpen(true);
    setPin("");
    setPinError(false);
  }

  function submitPin(e) {
    e.preventDefault();
    if (pin === MAINT_PIN) {
        setPinOpen(false); 
        setPin("");
        setPinError(false);
        setView("maintenance");
    } else {
      setPinError(true);
    }
  }

  return (
    <div className={`app-shell ${locked ? "is-locked" : ""}`}>
      <header className="topbar">
        <div className="brand">Food Kiosk</div>

        <div className="status">
            Tap items to add • Total: {formatMoney(total)}
        </div>

        <div className="topbar-actions">
            {!locked && view === "kiosk" && (
            <button className="maint-btn" type="button" onClick={openMaintenancePin}>
                Maintenance
            </button>
            )}
            {!locked && view === "maintenance" && (
            <button className="maint-btn" type="button" onClick={() => setView("kiosk")}>
                Back to Kiosk
            </button>
            )}
        </div>
    </header>

      {/* MAIN AREA: kiosk OR maintenance */}
      <main className={view === "kiosk" ? "layout" : "content"}>
        {view === "kiosk" ? (
            <>
            {/* LEFT: Menu grid */}
            <section className="menu">
                <div className="menu-grid">
                {items.map((item) => (
                    <button
                    key={item.id}
                    className={`menu-card ${item.available ? "" : "is-disabled"}`}
                    onClick={() => addToCart(item)}
                    disabled={!item.available}
                    type="button"
                    >
                    <img className="menu-img" src={item.img} alt={item.name} />
                    <div className="menu-overlay">
                        <span className="menu-name">{item.name}</span>
                        <span className="menu-price">{formatMoney(item.price)}</span>
                    </div>
                    {!item.available && <div className="soldout-tag">Unavailable</div>}
                    </button>
                ))}
                </div>
            </section>
          {/* RIGHT: Order panel */}
          <aside className="cart">
            <h2 className="cart-title">Your Order</h2>

            <div className="cart-lines">
              {cartLines.length === 0 ? (
                <div className="cart-empty">No items yet.</div>
              ) : (
                cartLines.map((line) => (
                  <div key={line.id} className="cart-line">
                    <div className="cart-line-main">
                      <div className="cart-line-name">{line.name}</div>
                      <div className="cart-line-sub">
                        {formatMoney(line.price)}
                      </div>
                    </div>

                    <div className="cart-line-controls">
                      <button className="icon-btn" onClick={() => dec(line.id)} type="button">−</button>
                      <span className="qty">{line.qty}</span>
                      <button className="icon-btn" onClick={() => inc(line.id)} type="button">+</button>
                      <button className="icon-btn danger" onClick={() => remove(line.id)} type="button">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-total-row">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>

              <button
                className="primary-btn"
                onClick={goToExtras}
                disabled={cartLines.length === 0}
                type="button"
              >
                Next: Extras 
              </button>

              {/* Exit pinned at bottom because footer is pushed down */}
              <button className="secondary-btn" type="button" onClick={lockNow}>
                Exit
              </button>
            </div>
          </aside>
          </>
        ) : view === "extras" ? (
          <div className="extras-shell">
            <div className="extras-card">
              <div className="extras-header">
                <div className="extras-title">Would you like any extras?</div>
                <div className="extras-subtitle">Select as many as you'd like - or skip entirely.</div>
              </div>

              <div className="extras-divider" />

              {["Condiments", "Utensils"].map((group) => (
                <div key={group} className="extras-group">
                  <div className="extras-group-label">{group}</div>
                  <div className="extras-grid">
                    {EXTRAS_OPTIONS.filter((o) => o.group === group).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`extras-chip ${selectedExtras.includes(opt.id) ? "is-selected" : ""}`}
                        onClick={() => toggleExtra(opt.id)}
                      >
                        {selectedExtras.includes(opt.id) && <span className="extras-check">✓</span>}
                        <span className="extras-emoji">{opt.emoji}</span>
                        <span className="extras-chip-label">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="extras-divider" />

              <div className="extras-actions">
                <button className="secondary-btn extras-skip" type="button" onClick={() => finishExtrasAndConfirm(true)}>
                  Skip
                </button>
                <button className="extras-confirm-btn" type="button" onClick={() => finishExtrasAndConfirm(false)}>
                  {selectedExtras.length > 0
                    ? `Add ${selectedExtras.length} extra${selectedExtras.length > 1 ? "s" : ""} & Confirm`
                    : "Confirm Order"}
                </button>
              </div>

              <button className="extras-back" type="button" onClick={() => setView("kiosk")}>
                ← Back to menu
              </button>
            </div>
          </div>
        ) : view === "maintenance" ? (
            <MaintenanceDashboard onExit={() => setView("kiosk")} />
            ) : view === "confirm" ? (
    <div className="confirm-shell">
      <div className="confirm-card">
        <div className="confirm-title">✅ Order Confirmed</div>
        <div className="confirm-subtitle">Thank you! Your order is being prepared.</div>

        <div className="confirm-meta">
          <div className="confirm-code">
            <div className="label">Order Code</div>
            <div className="value">{receipt?.code}</div>
          </div>

          <div className="confirm-total">
            <div className="label">Total</div>
            <div className="value">{formatMoney(receipt?.total ?? 0)}</div>
          </div>
        </div>

        <div className="confirm-timer muted">
          Est. cook time remaining:{" "}
          <strong>
            {Math.floor(cookRemainingMs / 60000)}:
            {String(Math.floor((cookRemainingMs % 60000) / 1000)).padStart(2, "0")}
          </strong>
        </div>

        <div className="confirm-grid">
          <div className="confirm-left">
            <div className="section-title">Items</div>
            <div className="confirm-lines">
              {(receipt?.lines ?? []).map((l) => (
                <div key={l.id} className="confirm-line">
                  <span>{l.name} × {l.qty}</span>
                  <span className="muted">{formatMoney(l.price * l.qty)}</span>
                </div>
              ))}
            </div>
            {receipt?.extras?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="section-title">Extras</div>
                <div className="confirm-extras-chips">
                  {receipt.extras.map((e) => (
                    <span key={e.id} className="confirm-extra-chip">
                      {e.emoji} {e.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="confirm-right">
            <div className="section-title">Track your order</div>

            <div className="qr-wrap">
              <QRCodeCanvas value={receipt?.url ?? ""} size={160} />
            </div>

            <div className="confirm-url muted">{receipt?.url}</div>

            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                setReceipt(null);
                setView("kiosk");
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null}
      </main>

      {/* PIN modal */}
    
    {pinOpen &&
    createPortal(
        <div className="modal-overlay" onClick={() => setPinOpen(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Maintenance Access</h3>
            <p className="muted" style={{ marginTop: 6 }}>
            Enter PIN (1234) to continue.
            </p>

            <form onSubmit={submitPin}>
            <input
                className="pin-input"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setPinError(false);
                }}
                placeholder="••••"
            />

            {pinError && <div className="pin-error">Invalid PIN.</div>}

            <div className="modal-actions">
                <button className="primary-btn" type="submit">Enter</button>
                <button className="secondary-btn" type="button" onClick={() => setPinOpen(false)}>
                Cancel
                </button>
            </div>
            </form>
        </div>
        </div>,
        document.body
    )}

      {/* Lockscreen */}
      {locked &&
        createPortal(
          <div className={`lockscreen ${isUnlocking ? "is-unlocking" : ""}`}>
            {/* IMPORTANT: use lock-content wrapper (your CSS expects it) */}
            <div className="lock-content">
              <div className="lock-left">
                <div className="lock-time">{currentTime.format(now)}</div>
                <div className="lock-weather">
                  <span className="wx-icon">☀︎</span>
                  <span className="wx-temp">{temperature}°F</span>
                </div>
              </div>

              <div className="lock-divider" />

              <div className="lock-right">
                <div className="lock-welcome">Welcome</div>
                <button className="primary-btn" onClick={startUnlock} type="button">
                  Start
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default App;
