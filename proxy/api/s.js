// proxy/api/s.js
// Static landing page for shared-schedule links. Handles BOTH:
//   - short IDs (8 chars of base62)  -> Redis lookup
//   - inline base64url payloads      -> decode directly (offline fallback)
// Then renders a read-only preview and tries to open the app via the
// snapshift:// scheme (Universal Links handle the direct-open case before we
// ever render this page).
const { getRedis } = require("./_lib/redis");

const APP_STORE_URL = "https://apps.apple.com/app/id6769178607";
const SHORT_ID_RE = /^[A-Za-z0-9]{4,16}$/;

// Builds a descriptive title from a share payload so the iOS Share Sheet
// preview cell and iMessage rich link show "Ryder's schedule — Week of Jun 22"
// instead of the generic "Shared schedule".
function titleForPayload(payload) {
  try {
    const name = payload && payload.name ? String(payload.name) : null;
    const week = payload && payload.week ? String(payload.week) : null;
    if (!name && !week) return "Shared schedule";
    let datePart = "";
    if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
      const [y, m, d] = week.split("-").map(Number);
      const months = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec",
      ];
      datePart = `${months[m - 1]} ${d}`;
    }
    if (name && datePart) return `${name}'s schedule — Week of ${datePart}`;
    if (name) return `${name}'s schedule`;
    if (datePart) return `Schedule — Week of ${datePart}`;
    return "Shared schedule";
  } catch {
    return "Shared schedule";
  }
}

function htmlPage(opts) {
  const {
    title = "Shared schedule",
    sub = "Opening in SnapShift…",
    payloadJson = "null",
    inlineToken = "",
  } = opts;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>SnapShift — ${escapeHtml(title)}</title>
<link rel="icon" href="https://snap-shift-proxy.vercel.app/icon.png"/>
<link rel="apple-touch-icon" href="https://snap-shift-proxy.vercel.app/icon.png"/>
<meta name="description" content="${escapeHtml(sub)}"/>
<!-- Open Graph (Messages, WhatsApp, Slack, etc.) -->
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="SnapShift"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(sub)}"/>
<meta property="og:image" content="https://snap-shift-proxy.vercel.app/icon.png"/>
<meta property="og:image:width" content="1024"/>
<meta property="og:image:height" content="1024"/>
<!-- Twitter -->
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(sub)}"/>
<meta name="twitter:image" content="https://snap-shift-proxy.vercel.app/icon.png"/>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;margin:0;background:#f5f5f7;color:#1d1d1f;padding:24px}
  .card{max-width:420px;margin:24px auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#6e6e73;font-size:14px;margin:0 0 16px}
  .day{font-weight:600;margin:14px 0 4px}.blk{padding:8px 10px;border-radius:8px;margin:4px 0;font-size:14px}
  .work{background:#2196F3;color:#fff}.busy{background:#e0e0e5;color:#3a3a3c}
  .cta{display:block;text-align:center;background:#2196F3;color:#fff;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;margin-top:10px}
  .open{background:#2d642a}
</style></head>
<body><div class="card" id="card">
  <h1 id="title">${escapeHtml(title)}</h1>
  <p class="muted" id="sub">${escapeHtml(sub)}</p>
  <div id="preview"></div>
  <a class="cta open" id="openApp" href="#">Open in SnapShift</a>
  <a class="cta" href="${APP_STORE_URL}">Get SnapShift</a>
</div>
<script>
  var PAYLOAD=${payloadJson};
  var INLINE_TOKEN=${JSON.stringify(inlineToken)};
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function b64urlEncode(str){
    // Encode UTF-8 string -> base64url (no padding). Used to re-emit the full
    // payload into the snapshift:// deep link when the user came in via a
    // short link (the app already knows how to decode base64url payloads).
    var ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    var bytes=[];var u=unescape(encodeURIComponent(str));
    for(var i=0;i<u.length;i++)bytes.push(u.charCodeAt(i));
    var out="";
    for(var j=0;j<bytes.length;j+=3){
      var b0=bytes[j],b1=bytes[j+1],b2=bytes[j+2];
      out+=ALPHABET[b0>>2];
      out+=ALPHABET[((b0&3)<<4)|((b1||0)>>4)];
      out+=b1===undefined?"":ALPHABET[((b1&15)<<2)|((b2||0)>>6)];
      out+=b2===undefined?"":ALPHABET[b2&63];
    }
    return out;
  }
  function renderPreview(p){
    document.getElementById("title").textContent=p.name+"'s week";
    document.getElementById("sub").textContent="Week of "+p.week;
    var byDay={};
    (p.shifts||[]).forEach(function(s){(byDay[s.date]=byDay[s.date]||[]).push({k:"work",t:s.start+"–"+s.end+(s.label?" · "+s.label:"")});});
    (p.busy||[]).forEach(function(b){(byDay[b.date]=byDay[b.date]||[]).push({k:"busy",t:b.allDay?"All day (busy)":b.start+"–"+b.end+" (busy)"});});
    var html="";
    Object.keys(byDay).sort().forEach(function(day){
      html+='<div class="day">'+esc(day)+'</div>';
      byDay[day].forEach(function(x){html+='<div class="blk '+x.k+'">'+esc(x.t)+'</div>';});
    });
    document.getElementById("preview").innerHTML=html||'<p class="muted">No events shared.</p>';
  }
  try{
    if(!PAYLOAD){throw new Error("missing payload");}
    renderPreview(PAYLOAD);
    var token=INLINE_TOKEN||b64urlEncode(JSON.stringify(PAYLOAD));
    var appUrl="snapshift://share-week?d="+token;
    document.getElementById("openApp").setAttribute("href",appUrl);
    // Best-effort auto-open. Many modern Safari versions block programmatic
    // navigation to non-http schemes without a gesture, so the visible
    // "Open in SnapShift" button is the reliable path.
    setTimeout(function(){try{window.location.href=appUrl;}catch(e){}},250);
    setTimeout(function(){
      document.getElementById("sub").textContent="Have SnapShift? Tap \\"Open in SnapShift\\". No app yet? Install below.";
    },1500);
  }catch(e){
    document.getElementById("sub").textContent="This link couldn't be read. It may have expired, or the link was copied incompletely.";
    document.getElementById("preview").innerHTML="";
    document.getElementById("openApp").style.display="none";
  }
</script>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Portable base64url -> UTF-8 string (matches client codec.ts).
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function b64urlDecode(input) {
  const lookup = {};
  for (let i = 0; i < ALPHABET.length; i++) lookup[ALPHABET[i]] = i;
  const bytes = [];
  for (let i = 0; i < input.length; i += 4) {
    const c0 = lookup[input[i]];
    const c1 = lookup[input[i + 1]];
    const c2 = lookup[input[i + 2]];
    const c3 = lookup[input[i + 3]];
    if (c0 === undefined || c1 === undefined) break;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 !== undefined) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 !== undefined) bytes.push(((c2 & 3) << 6) | c3);
  }
  return Buffer.from(bytes).toString("utf8");
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const token = (req.query && req.query.d) || "";

  if (!token) {
    res.status(404).send(
      htmlPage({
        title: "Shared schedule",
        sub: "This link is missing its share token.",
      })
    );
    return;
  }

  // Short ID → look up in Redis.
  if (SHORT_ID_RE.test(token)) {
    const redis = getRedis();
    if (!redis) {
      res.status(503).send(
        htmlPage({
          title: "Shared schedule",
          sub: "Short links are temporarily unavailable. Try again shortly.",
        })
      );
      return;
    }
    let raw;
    try {
      raw = await redis.get(`share:${token}`);
    } catch (e) {
      console.error("[/s] Redis read failed:", e?.message);
      res.status(503).send(
        htmlPage({
          title: "Shared schedule",
          sub: "Couldn't fetch this shared schedule. Try again shortly.",
        })
      );
      return;
    }
    if (!raw) {
      res.status(404).send(
        htmlPage({
          title: "Shared schedule",
          sub: "This shared schedule has expired or doesn't exist.",
        })
      );
      return;
    }
    const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
    res.status(200).send(
      htmlPage({ payloadJson: JSON.stringify(payload) })
    );
    return;
  }

  // Otherwise treat token as an inline base64url-encoded payload.
  try {
    const payload = JSON.parse(b64urlDecode(token));
    res.status(200).send(
      htmlPage({
        payloadJson: JSON.stringify(payload),
        inlineToken: token, // reuse the exact token in the snapshift:// URL
      })
    );
  } catch (e) {
    res.status(400).send(
      htmlPage({
        title: "Shared schedule",
        sub: "This link couldn't be read. It may have been copied incompletely.",
      })
    );
  }
};
