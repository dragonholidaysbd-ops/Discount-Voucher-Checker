import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 CONFIGURATION — Replace with your Google Sheet CSV URL
// Instructions: See setup guide provided with this file
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRcrx3UrR9k2ieS1vvOoSG76axonB64J4dMbmeAGfio6JmalbFc4QY17mTHHt07BjNm1qWPAjgKU94Y/pub?gid=0&single=true&output=csv";
// ─────────────────────────────────────────────────────────────────────────────

const COLS = {
  VOUCHER_CODE: 0,
  VOUCHER_VALUE: 1,
  ISSUE_DATE: 2,
  EXPIRY_DATE: 3,
  CUSTOMER_NAME: 4,
  REDEEMABLE_SERVICE: 5,
  DATE_OF_REDEMPTION: 6,
  SERVICE_OF_REDEMPTION: 7,
  NEW_PURCHASED_SERVICE_PRICE: 8,
};

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  });
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d) && d < new Date();
}

export default function VoucherChecker() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | found | notfound | error
  const [errMsg, setErrMsg] = useState("");

  async function handleCheck() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error("Could not load voucher data.");
      const text = await res.text();
      const rows = parseCSV(text);
      const match = rows.find(
        (r) => (r[COLS.VOUCHER_CODE] || "").trim().toUpperCase() === trimmed
      );
      if (match) {
        setResult(match);
        setStatus("found");
      } else {
        setStatus("notfound");
      }
    } catch (e) {
      setErrMsg(e.message || "Something went wrong.");
      setStatus("error");
    }
  }

  const expired = result ? isExpired(result[COLS.EXPIRY_DATE]) : false;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoMark}>◆</div>
          <h1 style={styles.title}>Voucher Lookup</h1>
          <p style={styles.subtitle}>Enter your voucher code to view details</p>
        </div>

        {/* Input */}
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            placeholder="e.g. GIFT-2024-ABCD"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <button
            style={{
              ...styles.btn,
              ...(status === "loading" ? styles.btnLoading : {}),
            }}
            onClick={handleCheck}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Checking…" : "Check"}
          </button>
        </div>

        {/* States */}
        {status === "notfound" && (
          <div style={{ ...styles.banner, ...styles.bannerWarn }}>
            ✕ &nbsp; No voucher found for <strong>{code}</strong>. Please check the code and try again.
          </div>
        )}
        {status === "error" && (
          <div style={{ ...styles.banner, ...styles.bannerError }}>
            ⚠ &nbsp; {errMsg}
          </div>
        )}

        {status === "found" && result && (
          <div style={styles.resultBox}>
            {/* Status badge */}
            <div style={styles.badgeRow}>
              <span
                style={{
                  ...styles.badge,
                  ...(expired ? styles.badgeExpired : styles.badgeValid),
                }}
              >
                {expired ? "⛔ EXPIRED" : "✔ VALID"}
              </span>
            </div>

            {/* ── PRIMARY INFO (highlighted) ── */}
            <div style={styles.primaryGrid}>
              <PrimaryCard
                label="Voucher Code"
                value={result[COLS.VOUCHER_CODE] || "—"}
                accent="#1a1a2e"
              />
              <PrimaryCard
                label="Voucher Value"
                value={result[COLS.VOUCHER_VALUE] || "—"}
                accent="#16213e"
                big
              />
              <PrimaryCard
                label="Issue Date"
                value={result[COLS.ISSUE_DATE] || "—"}
                accent="#0f3460"
              />
              <PrimaryCard
                label="Expiry Date"
                value={result[COLS.EXPIRY_DATE] || "—"}
                accent={expired ? "#7b1a1a" : "#0f3460"}
                warn={expired}
              />
            </div>

            {/* Divider */}
            <div style={styles.divider}><span style={styles.dividerLabel}>Additional Details</span></div>

            {/* ── SECONDARY INFO (normal) ── */}
            <div style={styles.secondaryGrid}>
              <SecRow label="Customer Name"              value={result[COLS.CUSTOMER_NAME]} />
              <SecRow label="Redeemable Service"         value={result[COLS.REDEEMABLE_SERVICE]} />
              <SecRow label="Date of Redemption"         value={result[COLS.DATE_OF_REDEMPTION]} />
              <SecRow label="Service of Redemption"      value={result[COLS.SERVICE_OF_REDEMPTION]} />
              <SecRow label="New Purchased Service Price" value={result[COLS.NEW_PURCHASED_SERVICE_PRICE]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryCard({ label, value, accent, big, warn }) {
  return (
    <div
      style={{
        ...styles.primaryCard,
        background: accent,
        border: warn ? "2px solid #e74c3c" : "2px solid transparent",
      }}
    >
      <span style={styles.primaryCardLabel}>{label}</span>
      <span style={{ ...styles.primaryCardValue, fontSize: big ? "1.6rem" : "1.15rem" }}>
        {value}
      </span>
    </div>
  );
}

function SecRow({ label, value }) {
  return (
    <div style={styles.secRow}>
      <span style={styles.secLabel}>{label}</span>
      <span style={styles.secValue}>{value || <em style={{ color: "#aaa" }}>—</em>}</span>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #e8eaf6 0%, #fce4ec 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    padding: "24px 16px",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "640px",
  },
  header: { textAlign: "center", marginBottom: "32px" },
  logoMark: { fontSize: "2.2rem", color: "#1a1a2e", marginBottom: "8px" },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1a1a2e",
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
  },
  subtitle: { color: "#888", fontSize: "0.95rem", margin: 0 },

  inputRow: { display: "flex", gap: "10px", marginBottom: "20px" },
  input: {
    flex: 1,
    padding: "14px 18px",
    fontSize: "1rem",
    border: "2px solid #e0e0e0",
    borderRadius: "10px",
    outline: "none",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "2px",
    color: "#1a1a2e",
    transition: "border-color 0.2s",
  },
  btn: {
    padding: "14px 28px",
    fontSize: "1rem",
    fontWeight: "700",
    background: "#1a1a2e",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    letterSpacing: "0.5px",
    transition: "background 0.2s",
  },
  btnLoading: { background: "#555", cursor: "not-allowed" },

  banner: {
    padding: "14px 18px",
    borderRadius: "10px",
    fontSize: "0.95rem",
    marginBottom: "16px",
  },
  bannerWarn: { background: "#fff8e1", color: "#7b5800", border: "1px solid #ffe082" },
  bannerError: { background: "#fce4ec", color: "#880e4f", border: "1px solid #f48fb1" },

  resultBox: { marginTop: "8px" },

  badgeRow: { textAlign: "center", marginBottom: "20px" },
  badge: {
    display: "inline-block",
    padding: "6px 20px",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: "700",
    letterSpacing: "1.5px",
    fontFamily: "sans-serif",
  },
  badgeValid: { background: "#e8f5e9", color: "#1b5e20", border: "1.5px solid #81c784" },
  badgeExpired: { background: "#fce4ec", color: "#b71c1c", border: "1.5px solid #e57373" },

  primaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    marginBottom: "24px",
  },
  primaryCard: {
    borderRadius: "12px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  primaryCardLabel: {
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    color: "rgba(255,255,255,0.65)",
    fontFamily: "sans-serif",
  },
  primaryCardValue: {
    color: "#fff",
    fontWeight: "700",
    lineHeight: 1.2,
  },

  divider: {
    textAlign: "center",
    borderTop: "1px solid #eee",
    marginBottom: "20px",
    position: "relative",
  },
  dividerLabel: {
    position: "relative",
    top: "-10px",
    background: "#fff",
    padding: "0 12px",
    fontSize: "0.75rem",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    fontFamily: "sans-serif",
  },

  secondaryGrid: { display: "flex", flexDirection: "column", gap: "10px" },
  secRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "10px 14px",
    background: "#f9f9f9",
    borderRadius: "8px",
    gap: "12px",
  },
  secLabel: {
    fontSize: "0.82rem",
    color: "#888",
    fontFamily: "sans-serif",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  secValue: {
    fontSize: "0.92rem",
    color: "#333",
    textAlign: "right",
    fontFamily: "sans-serif",
  },
};
