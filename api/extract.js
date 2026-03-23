export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel environment variables" });

  try {
    const { prompt, pdfBase64, textractData } = req.body;

    let messages;

    if (textractData?.available && textractData.fullText) {
      // ── Textract path: send extracted text + table structure to Claude ──────
      // No need to send the raw PDF — Claude reads the pre-processed text.
      // This is much cheaper on tokens and more accurate for structured data.
      const tablesSummary = (textractData.tables || []).map((t, ti) => {
        const rows = {};
        t.cells.forEach(c => {
          if (!rows[c.rowIndex]) rows[c.rowIndex] = {};
          rows[c.rowIndex][c.colIndex] = c.text;
        });
        const rowStrs = Object.values(rows)
          .map(row => Object.values(row).join(" | "))
          .join("\n");
        return `Table ${ti + 1} (page ${t.page}):\n${rowStrs}`;
      }).join("\n\n");

      const kvSummary = (textractData.kvPairs || [])
        .filter(kv => kv.key && kv.value)
        .map(kv => `${kv.key}: ${kv.value}`)
        .join("\n");

      const textractContext = [
        "=== DOCUMENT TEXT (via AWS Textract OCR) ===",
        textractData.fullText,
        kvSummary ? "\n=== KEY-VALUE PAIRS ===\n" + kvSummary : "",
        tablesSummary ? "\n=== TABLES ===\n" + tablesSummary : "",
      ].filter(Boolean).join("\n");

      messages = [{
        role: "user",
        content: `${prompt}\n\n${textractContext}`
      }];

    } else if (pdfBase64) {
      // ── Claude-only path: send raw PDF as document block ──────────────────
      messages = [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }
          },
          { type: "text", text: prompt }
        ]
      }];

    } else {
      // ── No document — text prompt only ────────────────────────────────────
      messages = [{ role: "user", content: prompt }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages,
      }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after") || "60";
      return res.status(429).json({
        error: `Rate limit reached. Please wait ${retryAfter} seconds and try again.`
      });
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errBody?.error?.message || `HTTP ${response.status}`
      });
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.status(200).json(data);

  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
}