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
    const result = await (env.AI as any).run("@cf/qwen/qwen3-30b-a3b-fp8", {
      messages: [
        {
          role: "system",
          content: `/no_think You are Pickle Phil, a funny and good-natured roaster. Write ONE short roast (1-2 sentences) about ${seed}. Include a pickle or food emoji. Output only the roast — no intro, no labels, no quotes.`,
        },
        { role: "user", content: `Roast me. Session ${nonce}.` },
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const raw = result?.choices?.[0]?.message?.content || result?.response || "";
    const roast = raw.trim() ||
      "You're so forgettable, even your pickle jar forgot your name. 🥒";

    return new Response(JSON.stringify({ roast, seed }), { headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers }
    );
  }
};
