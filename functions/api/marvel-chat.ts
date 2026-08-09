export interface Env {
  AI: Ai;
}

// Marvel-only Q&A chat. Usage: POST /api/marvel-chat {message, history?: [{role,content}]}
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.AI) {
    return new Response(JSON.stringify({ error: "AI binding not found" }), { status: 500, headers });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }

  const message = String(body?.message || "").slice(0, 500).trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), { status: 400, headers });
  }
  const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];

  try {
    const result = await (env.AI as any).run("@cf/qwen/qwen3-30b-a3b-fp8", {
      messages: [
        {
          role: "system",
          content: `/no_think You are the Multiverse Oracle, a knowledgeable and enthusiastic Marvel Comics & MCU expert embedded in a comic-book-styled fan site. Answer questions about Marvel movies, Disney+ shows, comics history, and characters in a punchy, comic-caption voice — a little dramatic, always fun. Keep answers to 2-5 sentences unless the user asks for more detail. If a question isn't about Marvel or comics, gently steer the conversation back to the Marvel Universe. Never claim to be an official Marvel or Disney product.`,
        },
        ...history.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"),
        { role: "user", content: message },
      ],
      max_tokens: 400,
      temperature: 0.8,
    });

    const raw = result?.choices?.[0]?.message?.content || result?.response || "";
    const reply = raw.trim() || "Even the Watcher is speechless on that one. Try asking me something else!";

    return new Response(JSON.stringify({ reply }), { headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Generation failed" }), { status: 500, headers });
  }
};
