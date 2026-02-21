import { useState, useEffect, useMemo } from 'react'
import { N } from './util/N'
import { currentTime } from './util/currentTime'
import { createPortal } from 'react-dom'
import './App.css'
import burger from './assets/burger.jpg'
import fries from './assets/fries.jpg'
import salad from './assets/salad.webp'
import pizza from './assets/Cheese-Pizza.jpg'
import sushi from './assets/sushi.jpg'



function App() {
  /** Hook: updates once per second */
  function useCurrentDate() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
    return now;
  }

  /** Mock menu data (dynamic later) */
  const INITIAL_ITEMS = [
    { id: "burger", name: "Burger", price: 8.99, img: burger, available: true },
    { id: "fries", name: "Fries", price: 3.49, img: fries, available: true },
    { id: "salad", name: "Salad", price: 6.25, img: salad, available: true },
    { id: "pizza", name: "Pizza", price: 10.5, img: pizza, available: true },
    { id: "sushi", name: "Sushi", price: 12.75, img: sushi, available: true },
  ];

  const [locked, setLocked] = useState(true);

  // menu is dynamic: later you can fetch it, or add items to this state
  const [items] = useState(INITIAL_ITEMS);

  // cart: { [itemId]: { id, name, price, qty } }
  const [cart, setCart] = useState({});

  const now = useCurrentDate();

  // mock weather (stable per mount)
  const [temperature] = useState(() => N.rand(65, 85));

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const total = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.price * line.qty, 0),
    [cartLines]
  );
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

  function formatMoney(n) {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  }

  function remove(itemId) {
    setCart((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  }

  function confirmOrder() {
    if (cartLines.length === 0) return;
    // mock confirm
    alert(`Order confirmed. Total: ${formatMoney(total)}`);
    setCart({});
  }

  const [isUnlocking, setIsUnlocking] = useState(false);
  const IDLE_MS = 60_000; // 1 minute (change as needed)

  useEffect(() => {
    if (locked) return; // don’t run idle timer while locked

    let timerId;

    const reset = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        setLocked(true);
      }, IDLE_MS);
    };

    // activity events that count as “not idle”
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // start timer immediately when unlocked

    return () => {
      window.clearTimeout(timerId);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [locked]);

  function unlock() {
    setIsUnlocking(true);

    // match the CSS duration (e.g. 350ms)
    window.setTimeout(() => {
      setLocked(false);
      setIsUnlocking(false);
    }, 350);
  }

  const [view, setView] = useState("kiosk"); // "kiosk" | "maintenancePin" | "maintenance"
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  function openMaintenance() {
    setPin("");
    setPinError(false);
    setView("maintenancePin");
  }

  function submitPin() {
    if (pin === "1234") {
      setView("maintenance");
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  function closeMaintenance() {
    setView("kiosk");
  }

  return (
    <div className="app-shell">
      {view === "maintenance" ? (
        <MaintenanceDashboard onExit={closeMaintenance} />
      ) : (
        <>
          <header className="topbar">
        <div className="brand">Food Kiosk</div>
        <div className="topbar-actions">
          <button className="maint-btn" type="button" onClick={openMaintenance}>
            Maintenance
          </button>
        </div>
        <div className="status">Tap items to add • Total: {formatMoney(total)}</div>
      </header>

      <main className="layout">
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
                    <button className="icon-btn" onClick={() => dec(line.id)} type="button">
                      −
                    </button>
                    <span className="qty">{line.qty}</span>
                    <button className="icon-btn" onClick={() => inc(line.id)} type="button">
                      +
                    </button>
                    <button className="icon-btn danger" onClick={() => remove(line.id)} type="button">
                      🗑️
                    </button>
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
            <button className="primary-btn" onClick={confirmOrder} disabled={cartLines.length === 0} type="button">
              Confirm Order
            </button>
            <button className="secondary-btn" onClick={() => { setCart({}); setLocked(true); }} type="button">
              Exit
            </button>
          </div>
        </aside>
      </main>

          {view === "maintenancePin" && (
            <div className="modal-overlay" onMouseDown={() => setView("kiosk")}>
              <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <h3>Maintenance Access</h3>
                <p className="muted">Enter PIN</p>

                <input
                  className="pin-input"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && submitPin()}
                  autoFocus
                />

                {pinError && <div className="pin-error">Invalid PIN</div>}

                <div className="modal-actions">
                  <button className="icon-btn" type="button" onClick={() => setView("kiosk")}>Cancel</button>
                  <button className="primary-btn" type="button" onClick={submitPin}>Enter</button>
                </div>
              </div>
            </div>
          )}

          {/* Lockscreen overlay (Portal) */}
          {locked &&
            createPortal(
              <div className={`lockscreen ${isUnlocking ? "is-unlocking" : ""}`}>
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
                    <button className="primary-btn" onClick={unlock} type="button">
                      Start
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}

export default App
