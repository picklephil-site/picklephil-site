export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({ ok: true, time: Date.now(), rand: Math.random() }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
};
