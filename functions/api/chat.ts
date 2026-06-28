export interface Env {
  AI: Ai;
}

interface PageContext {
  title?: string;
  path?: string;
  meta?: string;
  headings?: string;
  bodyText?: string;
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

  let body: { messages?: Array<{ role: string; content: string }>; pageContext?: PageContext };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  const userMessages = (body.messages || []).slice(-10);
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
  const ctx = body.pageContext || {};

  // Only generate an image on explicit requests ("draw me", "generate a photo of", etc.)
  const isExplicitImgRequest =
    /\b(generate|create|draw|make|paint|sketch|render|produce)\b.{0,60}\b(image|photo|picture|pic|drawing|illustration)\b/i.test(lastUserMsg) ||
    /\b(show|give)\s+me\b.{0,30}\b(image|photo|picture|pic|drawing|illustration)\b/i.test(lastUserMsg) ||
    /^(draw|paint|sketch|generate|create|make|render)\s+/i.test(lastUserMsg.trim());

  // Build page context block for the system prompt
  const pageLines: string[] = [];
  if (ctx.title) pageLines.push(`Page: "${ctx.title}" (${ctx.path || ''})`);
  if (ctx.meta)  pageLines.push(`Description: ${ctx.meta}`);
  if (ctx.headings) pageLines.push(`Headings: ${ctx.headings}`);
  if (ctx.bodyText) pageLines.push(`Content: ${ctx.bodyText}`);
  const pageBlock = pageLines.length
    ? '\n\nContext about the page the user is on:\n' + pageLines.join('\n')
    : '';

  const messages = [
    {
      role: "system",
      content:
        "/no_think You are Pickle Phil, a friendly and helpful assistant on a personal website. " +
        "Be conversational, warm, and occasionally playful. " +
        "Keep responses concise — 1 to 3 sentences max. " +
        "Use the page context below to answer questions about what the user is currently looking at." +
        pageBlock,
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

    // Strip any stray [IMG:] tag the model might produce
    const imgTagMatch = rawReply.match(/\[IMG:\s*([^\]]+)\]/i);
    const reply = rawReply.replace(/\[IMG:[^\]]*\]/gi, '').trim();

    // Build image prompt only on explicit requests
    let imagePrompt: string | null = null;
    if (imgTagMatch) {
      imagePrompt = imgTagMatch[1].trim();
    } else if (isExplicitImgRequest) {
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
