export interface Env {
  MARVEL_PUBLIC_KEY: string;
  MARVEL_PRIVATE_KEY: string;
}

// Proxies the official Marvel Comics API (developer.marvel.com) so the
// private key never reaches the browser. Usage:
//   GET /api/marvel-comics?path=/characters&nameStartsWith=Iron+Man
//   GET /api/marvel-comics?path=/comics&titleStartsWith=Fantastic+Four&issueNumber=1
const ALLOWED_PATH = /^\/(characters|characters\/\d+\/comics|comics)$/;

async function md5(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  // Web Crypto has no MD5, so we implement the RFC 1321 algorithm directly.
  return md5Hex(data);
}

// --- Minimal RFC 1321 MD5 implementation (public-domain algorithm) ---
function md5Hex(bytes: Uint8Array): string {
  function rotl(x: number, c: number) { return (x << c) | (x >>> (32 - c)); }
  function add(a: number, b: number) { return (a + b) >>> 0; }

  const K = new Int32Array([
    -680876936,-389564586,606105819,-1044525330,-176418897,1200080426,-1473231341,-45705983,
    1770035416,-1958414417,-42063,-1990404162,1804603682,-40341101,-1502002290,1236535329,
    -165796510,-1069501632,643717713,-373897302,-701558691,38016083,-660478335,-405537848,
    568446438,-1019803690,-187363961,1163531501,-1444681467,-51403784,1735328473,-1926607734,
    -378558,-2022574463,1839030562,-35309556,-1530992060,1272893353,-155497632,-1094730640,
    681279174,-358537222,-722521979,76029189,-640364487,-421815835,530742520,-995338651,
    -198630844,1126891415,-1416354905,-57434055,1700485571,-1894986606,-1051523,-2054922799,
    1873313359,-30611744,-1560198380,1309151649,-145523070,-1120210379,718787259,-343485551
  ]);
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
             5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
             4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
             6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];

  const msgLen = bytes.length;
  const withOne = msgLen + 1;
  const padLen = ((withOne % 64) <= 56 ? 56 - (withOne % 64) : 120 - (withOne % 64));
  const totalLen = withOne + padLen + 8;
  const buf = new Uint8Array(totalLen);
  buf.set(bytes);
  buf[msgLen] = 0x80;
  const bitLenLo = (msgLen * 8) >>> 0;
  const bitLenHi = Math.floor((msgLen * 8) / 0x100000000) >>> 0;
  const dv = new DataView(buf.buffer);
  dv.setUint32(totalLen - 8, bitLenLo, true);
  dv.setUint32(totalLen - 4, bitLenHi, true);

  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < totalLen; chunkStart += 64) {
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) M[i] = dv.getInt32(chunkStart + i * 4, true);

    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = add(F, add(A, add(K[i], M[g])));
      A = D; D = C; C = B;
      B = add(B, rotl(F, S[i]));
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D);
  }

  function toHexLE(n: number) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, n, true);
    return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
  }
  return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=21600",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.MARVEL_PUBLIC_KEY || !env.MARVEL_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "Marvel API keys not configured" }), { status: 500, headers });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  if (!ALLOWED_PATH.test(path)) {
    return new Response(JSON.stringify({ error: "path not allowed" }), { status: 400, headers });
  }

  const ts = Date.now().toString();
  const hash = await md5(ts + env.MARVEL_PRIVATE_KEY + env.MARVEL_PUBLIC_KEY);

  const upstream = new URL(`https://gateway.marvel.com/v1/public${path}`);
  for (const [key, value] of url.searchParams) {
    if (key === "path") continue;
    upstream.searchParams.set(key, value);
  }
  upstream.searchParams.set("ts", ts);
  upstream.searchParams.set("apikey", env.MARVEL_PUBLIC_KEY);
  upstream.searchParams.set("hash", hash);

  try {
    const res = await fetch(upstream.toString());
    const body = await res.text();
    return new Response(body, { status: res.status, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Marvel API request failed" }), { status: 502, headers });
  }
};
