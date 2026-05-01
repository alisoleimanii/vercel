export const config = { runtime: "edge" };

export default async function handler(req) {
  try {
    // گرفتن متغیر و حذف فاصله‌های خالی احتمالی (Trim)
    const TARGET = (process.env.TARGET_DOMAIN || "").trim();
    
    if (!TARGET.startsWith("http")) {
      return new Response("Config Error: TARGET_DOMAIN missing or invalid. Check Vercel Env Variables.", { status: 500 });
    }

    const reqUrl = new URL(req.url);
    // ساختن URL مقصد به صورت کاملاً امن
    const targetUrl = TARGET.replace(/\/$/, "") + reqUrl.pathname + reqUrl.search;

    const out = new Headers();
    const STRIP = [
      "host", // هدر هاست باید حذف بشه ولی دستی نباید ست بشه!
      "connection", "upgrade", "keep-alive", 
      "transfer-encoding", "te", "trailer", 
      "proxy-authorization", "proxy-authenticate"
    ];
    
    for (const [k, v] of req.headers.entries()) {
      const key = k.toLowerCase();
      if (STRIP.includes(key) || key.startsWith("x-vercel-") || key.startsWith("x-forwarded-")) continue;
      out.set(k, v);
    }
    
    // اینجا دیگه out.set("host", ...) نداریم. موتور خودش از targetUrl می‌خونه!

    const init = {
      method: req.method,
      headers: out,
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      init.body = req.body;
      init.duplex = "half";
    }

    const response = await fetch(targetUrl, init);
    return response;

  } catch (err) {
    // حالا ارور به ما میگه دقیقاً سعی کرده به کجا وصل بشه!
    return new Response(`Crash Report 2:\nTarget Env: ${process.env.TARGET_DOMAIN}\nAttempted URL: ${TARGET.replace(/\/$/, "") + new URL(req.url).pathname}\nMessage: ${err.message}`, { status: 502 });
  }
}
