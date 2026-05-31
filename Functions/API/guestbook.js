const VALID_TYPES = new Set(["message", "suggestion", "media", "bug"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const message = (data.message || "").trim().slice(0, 1000);
  if (!message) return json({ error: "Message required" }, 400);

  const id = Date.now().toString();
  const entry = {
    id,
    name: (data.name || "Anonymous Pickle").trim().slice(0, 80),
    message,
    mood: (data.mood || "🥒"),
    type: VALID_TYPES.has(data.type) ? data.type : "message",
    time: new Date().toISOString(),
  };

  await env.GUESTBOOK.put(id, JSON.stringify(entry));
  return json({ success: true });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const adminKey = env.ADMIN_KEY;

  if (!adminKey || key !== adminKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  const list = await env.GUESTBOOK.list();
  const items = [];
  for (const k of list.keys) {
    const val = await env.GUESTBOOK.get(k.name, { type: "json" });
    if (val) items.push(val);
  }
  return json(items.sort((a, b) => Number(b.id) - Number(a.id)));
}
