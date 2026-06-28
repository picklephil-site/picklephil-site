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
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';

  // Detect image requests from the user's message — don't rely on AI to tag them
  const isImgRequest =
    /\b(image|photo|picture|pic|draw|drawing|paint|painting|sketch|illustration)\b/i.test(lastUserMsg) ||
    /\b(generate|create|make|show me|give me|render)\b.{0,40}\b(image|photo|picture|pic|drawing|illustration)\b/i.test(lastUserMsg);

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

    const rawReply =
      result?.choices?.[0]?.message?.content ||
      result?.response ||
      "Got a little pickled there — try again!";

    // Strip any [IMG:] tag the model might still produce
    const imgTagMatch = rawReply.match(/\[IMG:\s*([^\]]+)\]/i);
    const reply = rawReply.replace(/\[IMG:[^\]]*\]/gi, '').trim();

    // Build image prompt: use AI's description if it provided one, else clean up user message
    let imagePrompt: string | null = null;
    if (imgTagMatch) {
      imagePrompt = imgTagMatch[1].trim();
    } else if (isImgRequest) {
      imagePrompt = lastUserMsg
        .replace(/\b(please|can you|could you|would you)\s*/gi, '')
        .replace(/\b(generate|create|draw|make|show me|give me|display|render|paint|sketch)\s+/gi, '')
        .replace(/\b(a|an|the|some|me)\s+(image|photo|picture|pic|drawing|illustration)\s+(of\s+)?/gi, '')
        .replace(/\b(image|photo|picture|pic|drawing|illustration)\s+(of\s+)?/gi, '')
        .replace(/^(of\s+|a\s+|an\s+)/gi, '')
        .trim() || lastUserMsg;
    }

    return new Response(JSON.stringify({ reply, imagePrompt }), { headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers }
    );
  }
};
