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
    `Give exactly 3 specific ${typeLabel} recommendations based on what the user describes. ` +
    `Use real titles that actually exist. ` +
    `Format your response EXACTLY like this — nothing before or after:\n` +
    `1. Title (Year) — One sentence in Pickle Phil's fun voice explaining why it fits.\n` +
    `2. Title (Year) — One sentence.\n` +
    `3. Title (Year) — One sentence.`;

  try {
    const result = await (env.AI as any).run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: q },
      ],
      max_tokens: 800,
      temperature: 0.8,
    });

    const raw = result?.choices?.[0]?.message?.content || result?.response || "";
    // Take only the last paragraph to skip any model reasoning preamble
    const parts = raw.trim().split(/\n{2,}/);
    const text = parts[parts.length - 1].trim();
    return new Response(JSON.stringify({ text }), { headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers }
    );
  }
};
