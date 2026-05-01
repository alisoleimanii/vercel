export const config = { runtime: "edge" };

export default async function handler(req) {
  // تعریف متغیرها بیرون از بلاک try برای جلوگیری از خطای ReferenceError
  const rawTarget = process.env.TARGET_DOMAIN || "";
  const TARGET = rawTarget.trim();

  try {
    if (!TARGET.startsWith("http")) {
      return new Response("Config Error: TARGET_DOMAIN missing or invalid. Check Vercel Env Variables.", { status: 500 });
    }

    const reqUrl = new URL(req.url);
    const targetUrl = TARGET.replace(/\/$/, "") + reqUrl.pathname + reqUrl.search;

    const out = new Headers();
    const STRIP = [
      "host", 
      "connection", "upgrade", "keep-alive", 
      "transfer-encoding", "te", "trailer", 
      "proxy-authorization", "proxy-authenticate"
    ];
    
    for (const [k, v] of req.headers.entries()) {
      const key = k.toLowerCase();
      if (STRIP.includes(key) || key.startsWith("x-vercel-") || key.startsWith("x-forwarded-")) continue;
      out.set(k, v);
    }

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
    // الان TARGET در دسترس است و کانتینر کِرَش نمی‌کند
    return new Response(`Crash Report 3:\nTarget Env: ${TARGET}\nMessage: ${err.message}`, { status: 502 });
  }
}
