export interface Env {
  AI: Ai;
}

// Generates a fresh AI roast in Pickle Phil's voice.
// Usage: GET /api/roast
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
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

  try {
    const result = await (env.AI as any).run("@cf/zai-org/glm-4.7-flash", {
      messages: [
        {
          role: "system",
          content:
            "You are Pickle Phil, a quick-witted and good-natured roaster. " +
            "Write exactly ONE original roast — 1 to 2 sentences, punchy and playful. " +
            "Never mean, offensive, or about appearance. Keep it light and fun. " +
            "Add one pickle or food emoji somewhere in the text. " +
            "Output only the roast itself — no intro, no quotes, no labels.",
        },
        { role: "user", content: "Give me a fresh roast." },
      ],
      max_tokens: 120,
      temperature: 0.95,
    });

    const roast = (result?.response ?? "").trim() ||
      "You're so forgettable, even your pickle jar forgot your name. 🥒";

    return new Response(JSON.stringify({ roast }), { headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers }
    );
  }
};
