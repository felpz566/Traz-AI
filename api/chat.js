const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// O primeiro é o modelo principal.
// Os seguintes são usados automaticamente se o anterior falhar.
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash"
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY não configurada nas Environment Variables da Vercel."
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Envie pelo menos uma mensagem." });
    }

    const contents = messages
      .filter(
        m =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    if (!contents.length) {
      return res.status(400).json({ error: "Nenhuma mensagem válida foi enviada." });
    }

    let lastError = "Não foi possível consultar nenhum modelo.";

    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError = data?.error?.message || `Erro no modelo ${model}.`;
          console.warn(`Modelo ${model} falhou:`, lastError);
          continue;
        }

        const reply = data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

        if (!reply) {
          lastError = `O modelo ${model} não retornou uma resposta.`;
          console.warn(lastError);
          continue;
        }

        return res.status(200).json({
          reply,
          model
        });
      } catch (error) {
        lastError = error?.message || `Falha ao consultar ${model}.`;
        console.warn(`Modelo ${model} falhou:`, error);
      }
    }

    return res.status(502).json({
      error: `Todos os modelos falharam. Último erro: ${lastError}`
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return res.status(500).json({
      error: "Falha ao conectar com o Gemini."
    });
  }
}
