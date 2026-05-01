export const config = { runtime: "edge" };

export default async function handler(req) {
  try {
    const TARGET = process.env.TARGET_DOMAIN || "";
    
    // اعتبارسنجی بی‌رحمانه متغیر محیطی
    if (!TARGET.startsWith("http")) {
      return new Response("Config Error: TARGET_DOMAIN must start with http:// or https:// (e.g., http://1.2.3.4:80)", { status: 500 });
    }

    const reqUrl = new URL(req.url);
    const targetUrl = new URL(reqUrl.pathname + reqUrl.search, TARGET).toString();

    const out = new Headers();
    const STRIP = [
      "host", "connection", "upgrade", "keep-alive", 
      "transfer-encoding", "te", "trailer", 
      "proxy-authorization", "proxy-authenticate"
    ];
    
    for (const [k, v] of req.headers.entries()) {
      const key = k.toLowerCase();
      if (STRIP.includes(key) || key.startsWith("x-vercel-") || key.startsWith("x-forwarded-")) continue;
      out.set(k, v);
    }
    
    // تنظیم دقیق هدر Host برای سرور مقصد
    out.set("host", new URL(TARGET).host);

    const init = {
      method: req.method,
      headers: out,
      redirect: "manual",
    };

    // تزریق ایمن Body فقط در صورت وجود، برای جلوگیری از کِرَشِ internal error
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      init.body = req.body;
      init.duplex = "half";
    }

    const response = await fetch(targetUrl, init);
    return response;

  } catch (err) {
    // خروجی کامل خطا برای دیباگ دقیق
    return new Response(`Crash Report:\nMessage: ${err.message}\nStack: ${err.stack}`, { status: 502 });
  }
}
