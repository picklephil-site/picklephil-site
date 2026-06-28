export interface Env {
  AI: Ai;
}

// Generates a fresh AI roast in Pickle Phil's voice.
// Usage: GET /api/roast
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.AI) {
    return new Response(
      JSON.stringify({ error: "AI binding not found" }),
      { status: 500, headers }
    );
  }

  const url   = new URL(request.url);
  const seed  = url.searchParams.get("seed") || "procrastination";
  const nonce = url.searchParams.get("_")    || String(Date.now());

  try {
    const result = await (env.AI as any).run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        {
          role: "system",
          content: `You are Pickle Phil. Respond with only a single short roast joke (1-2 sentences). Include a pickle emoji. No thinking, no analysis, no preamble. Just the joke. Session: ${nonce}.`,
        },
        { role: "user", content: `Roast me about ${seed}.` },
      ],
      max_tokens: 600,
      temperature: 0.95,
    });

    const raw = result?.choices?.[0]?.message?.content || result?.response || "";
    // Strip any leading reasoning/analysis — take only the last non-empty paragraph
    const parts = raw.trim().split(/\n{2,}/);
    const roast = parts[parts.length - 1].trim() ||
      "You're so forgettable, even your pickle jar forgot your name. 🥒";

    return new Response(JSON.stringify({ roast, seed, _debug: raw.slice(0, 200) }), { headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers }
    );
  }
};
