export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, pdfBase64 } = req.body;

    console.log("Extract called — has PDF:", !!pdfBase64, "— PDF size:", pdfBase64 ? pdfBase64.length : 0);
    console.log("API key present:", !!process.env.ANTHROPIC_API_KEY);

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in environment variables" });
    }

    let messages;
    if (pdfBase64) {
      messages = [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64
            }
          },
          { type: "text", text: prompt }
        ]
      }];
    } else {
      console.log("WARNING: No PDF provided — extracting from filename only");
      messages = [{ role: "user", content: prompt }];
    }

    console.log("Calling Anthropic API...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages
      })
    });

    const data = await response.json();
    console.log("Anthropic response status:", response.status);
    console.log("Anthropic response:", JSON.stringify(data).substring(0, 500));

    if (data.error) throw new Error(data.error.message);
    res.status(200).json(data);

  } catch (err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
}