import mammoth from "mammoth";
import * as XLSX from "xlsx";

// Map file extensions to Claude-accepted image media types
const IMAGE_TYPES = {
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  gif:  "image/gif",
  webp: "image/webp",
  tif:  "image/tiff",
  tiff: "image/tiff",
  bmp:  "image/png",   // convert BMP by sending as PNG fallback
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel environment variables" });

  try {
    const { prompt, pdfBase64, fileType, textractData } = req.body;

    let messages;
    const type = (fileType || "pdf").toLowerCase().replace(/^\./, "");

    if (textractData?.available && textractData.fullText) {
      // ── Textract path ─────────────────────────────────────────────────────
      const tablesSummary = (textractData.tables || []).map((t, ti) => {
        const rows = {};
        t.cells.forEach(c => {
          if (!rows[c.rowIndex]) rows[c.rowIndex] = {};
          rows[c.rowIndex][c.colIndex] = c.text;
        });
        return `Table ${ti + 1} (page ${t.page}):\n` +
          Object.values(rows).map(r => Object.values(r).join(" | ")).join("\n");
      }).join("\n\n");

      const kvSummary = (textractData.kvPairs || [])
        .filter(kv => kv.key && kv.value)
        .map(kv => `${kv.key}: ${kv.value}`)
        .join("\n");

      const ctx = [
        "=== DOCUMENT TEXT (via AWS Textract OCR) ===",
        textractData.fullText,
        kvSummary  ? "\n=== KEY-VALUE PAIRS ===\n"  + kvSummary  : "",
        tablesSummary ? "\n=== TABLES ===\n" + tablesSummary : "",
      ].filter(Boolean).join("\n");

      messages = [{ role: "user", content: `${prompt}\n\n${ctx}` }];

    } else if (pdfBase64) {

      if (type === "pdf") {
        // ── Native PDF ────────────────────────────────────────────────────
        messages = [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: prompt }
          ]
        }];

      } else if (IMAGE_TYPES[type]) {
        // ── Image (JPG, PNG, TIFF, GIF, WEBP) ────────────────────────────
        // Claude vision reads the image natively — great for scanned invoices
        messages = [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type:       "base64",
                media_type: IMAGE_TYPES[type],
                data:       pdfBase64,
              }
            },
            { type: "text", text: prompt }
          ]
        }];

      } else if (type === "docx" || type === "doc") {
        // ── Word document ─────────────────────────────────────────────────
        const buffer = Buffer.from(pdfBase64, "base64");
        let docText = "";
        try {
          const result = await mammoth.extractRawText({ buffer });
          docText = result.value || "";
        } catch (e) {
          docText = "(Could not extract text from Word document)";
        }
        messages = [{
          role: "user",
          content: `${prompt}\n\n=== DOCUMENT TEXT (Word document) ===\n${docText}`
        }];

      } else if (type === "xlsx" || type === "xls") {
        // ── Excel spreadsheet ─────────────────────────────────────────────
        const buffer = Buffer.from(pdfBase64, "base64");
        let excelText = "";
        try {
          const wb = XLSX.read(buffer, { type: "buffer" });
          excelText = wb.SheetNames.map(name => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" });
            return `Sheet: ${name}\n` + rows.map(r => r.join(" | ")).join("\n");
          }).join("\n\n");
        } catch (e) {
          excelText = "(Could not extract data from Excel file)";
        }
        messages = [{
          role: "user",
          content: `${prompt}\n\n=== DOCUMENT DATA (Excel spreadsheet) ===\n${excelText}`
        }];

      } else {
        // ── Unknown type — text prompt only ───────────────────────────────
        messages = [{ role: "user", content: prompt }];
      }

    } else {
      messages = [{ role: "user", content: prompt }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages,
      }),
    });

    if (response.status === 429) {
      const retry = response.headers.get("retry-after") || "60";
      return res.status(429).json({ error: `Rate limit reached. Please wait ${retry} seconds and try again.` });
    }
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errBody?.error?.message || `HTTP ${response.status}` });
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.status(200).json(data);

  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
}