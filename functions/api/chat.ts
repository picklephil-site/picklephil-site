export interface Env {
  AI: Ai;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.AI) {
    return new Response(JSON.stringify({ error: "AI binding not found" }), { status: 500, headers });
  }

  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  const userMessages = (body.messages || []).slice(-10);

  const messages = [
    {
      role: "system",
      content:
        "/no_think You are Pickle Phil, a friendly and helpful assistant on a personal website. " +
        "Be conversational, warm, and occasionally playful. " +
        "Keep responses concise — 1 to 3 sentences max. " +
        "You can answer questions, have casual conversations, or just chat.",
    },
    ...userMessages,
  ];

  try {
    const result = await (env.AI as any).run("@cf/qwen/qwen3-30b-a3b-fp8", {
      messages,
      max_tokens: 300,
      temperature: 0.8,
    });

    const reply =
      result?.choices?.[0]?.message?.content ||
      result?.response ||
      "Got a little pickled there — try again!";

    return new Response(JSON.stringify({ reply }), { headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers }
    );
  }
};
