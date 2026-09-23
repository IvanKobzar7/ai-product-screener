import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

const MARKETPLACE_LABELS = {
  amazon: "Amazon",
  walmart: "Walmart",
  ebay: "eBay",
  etsy: "Etsy",
  tiktok_shop: "TikTok Shop",
};

const INITIAL_FORM = {
  product_name: "",
  marketplace: "amazon",
  buy_cost: "",
  sell_price: "",
  fulfillment_fee: "",
  monthly_sales: "",
  use_ai: true,
};

function formatMoney(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function App() {
  const [marketplaces, setMarketplaces] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load the marketplace list from the backend once, when the page opens
  useEffect(() => {
    fetch(`${API_URL}/marketplaces`)
      .then((response) => response.json())
      .then(setMarketplaces)
      .catch(() => setError("Cannot reach the backend. Is it running on port 8000?"));
  }, []);

  const selectedFees = marketplaces.find((m) => m.id === form.marketplace);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: form.product_name,
          marketplace: form.marketplace,
          buy_cost: Number(form.buy_cost),
          sell_price: Number(form.sell_price),
          fulfillment_fee: Number(form.fulfillment_fee || 0),
          monthly_sales: Number(form.monthly_sales || 0),
          use_ai: form.use_ai,
        }),
      });
      if (response.status === 429) throw new Error("Too many requests. Please try again in an hour.");
      if (!response.ok) throw new Error(`Request failed (${response.status})`);      
      setResult(await response.json());
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Cannot reach the backend." : err.message);
    } finally {
      setLoading(false);
    }
  }

  // Split the AI answer: first line is BUY/MAYBE/SKIP, the rest are reasons
  const verdictLines = result?.ai_verdict?.split("\n").filter((line) => line.trim()) ?? [];
  const verdictWord = verdictLines[0]?.trim().toUpperCase();
  const reasons = verdictLines.slice(1).map((line) => line.replace(/^[\s•\-*]+/, ""));

  return (
    <main className="app">
      <header className="header">
        <h1>AI Product Screener</h1>
        <p>Check profit, margin and ROI across marketplaces, with an AI verdict.</p>
      </header>

      <form className="card form" onSubmit={handleSubmit}>
        <label className="field full">
          Product name
          <input name="product_name" value={form.product_name} onChange={handleChange} required />
        </label>

        <label className="field full">
          Where will you sell?
          <select name="marketplace" value={form.marketplace} onChange={handleChange}>
            {marketplaces.map((m) => (
              <option key={m.id} value={m.id}>
                {MARKETPLACE_LABELS[m.id] ?? m.id}
              </option>
            ))}
          </select>
        </label>
        {selectedFees && <p className="fee-note">{selectedFees.note}</p>}

        <label className="field">
          Buy cost ($)
          <input name="buy_cost" type="number" step="0.01" min="0.01"
            value={form.buy_cost} onChange={handleChange} required />
        </label>

        <label className="field">
          Sell price ($)
          <input name="sell_price" type="number" step="0.01" min="0.01"
            value={form.sell_price} onChange={handleChange} required />
        </label>

        <label className="field">
          Fulfillment fee per unit ($)
          <input name="fulfillment_fee" type="number" step="0.01" min="0"
            value={form.fulfillment_fee} onChange={handleChange} />
        </label>

        <label className="field">
          Expected monthly sales
          <input name="monthly_sales" type="number" step="1" min="0"
            value={form.monthly_sales} onChange={handleChange} />
        </label>

        <label className="checkbox">
          <input name="use_ai" type="checkbox" checked={form.use_ai} onChange={handleChange} />
          Get AI verdict from Claude (~$0.002 per check)
        </label>

        <button className="submit" type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze product"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="card">
          <h2>{result.product_name}</h2>
          <div className="stats">
            <Stat label="Profit / unit" value={formatMoney(result.profit_per_unit)} good={result.profit_per_unit > 0} />
            <Stat label="Margin" value={`${result.margin_percent}%`} good={result.margin_percent > 0} />
            <Stat label="ROI" value={`${result.roi_percent}%`} good={result.roi_percent > 0} />
            <Stat label="Marketplace fee" value={formatMoney(result.marketplace_fee)} />
            <Stat label="Total fees" value={formatMoney(result.total_fees)} />
            <Stat label="Monthly profit" value={formatMoney(result.monthly_profit)} good={result.monthly_profit >= 0} />
          </div>

          {verdictWord && (
            <div className="verdict">
              <span className={`badge ${verdictWord.toLowerCase()}`}>{verdictWord}</span>
              <ul>
                {reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, good }) {
  const colorClass = good === undefined ? "" : good ? "positive" : "negative";
  return (
    <div className="stat">
      <span>{label}</span>
      <strong className={colorClass}>{value}</strong>
    </div>
  );
}

export default App;