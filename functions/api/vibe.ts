export interface Env {
  AI: Ai;
}

// Returns AI-generated entertainment recommendations in Pickle Phil's voice.
// Usage: GET /api/vibe?q=something+scary+but+fun&type=movie|tv|music|any
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };

  const url  = new URL(request.url);
  const q    = (url.searchParams.get("q") || "").trim();
  const type = url.searchParams.get("type") || "any";

  if (!q) {
    return new Response(JSON.stringify({ error: "No query provided" }), { status: 400, headers });
  }

  if (!env.AI) {
    return new Response(JSON.stringify({ error: "AI binding not found" }), { status: 500, headers });
  }

  const typeLabel =
    type === "movie" ? "movies" :
    type === "tv"    ? "TV shows" :
    type === "music" ? "songs or albums" :
    "movies, TV shows, or songs";

  const systemPrompt =
    `You are Pickle Phil, a chill entertainment buddy with big pickle energy and a playful sense of humor. ` +
    `Give exactly 3 ${typeLabel} recommendations based on what the user describes. ` +
    `Be specific — use real titles that actually exist. ` +
    `Reply with ONLY a valid JSON array — no text before or after it. Use this exact format:\n` +
    `[{"title":"...","year":"...","type":"movie|tv|music","why":"one sentence in Pickle Phil's voice explaining why it fits"}]`;

  try {
    const result = await (env.AI as any).run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: q },
      ],
      max_tokens: 500,
      temperature: 0.75,
    });

    const text = (result?.response ?? "").trim();

    let recommendations: unknown[] = [];
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      try { recommendations = JSON.parse(match[0]); } catch { /* fall through to empty */ }
    }

    return new Response(JSON.stringify({ recommendations, raw: text }), { headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers }
    );
  }
};
