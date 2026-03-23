export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, pdfBase64 } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel environment variables" });
    }

    const messages = pdfBase64 ? [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
        { type: "text", text: prompt }
      ]
    }] : [{ role: "user", content: prompt }];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages
      })
    });

    // Handle rate limit specifically
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after") || "60";
      return res.status(429).json({
        error: `Rate limit reached. Please wait ${retryAfter} seconds and try again. Consider upgrading your Anthropic usage tier for higher limits.`
      });
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody?.error?.message || `HTTP ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    res.status(200).json(data);

  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
}