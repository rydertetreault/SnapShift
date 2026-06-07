// proxy/api/s.js
// Static landing page for shared-schedule links. Decodes the payload from ?d=,
// renders a read-only preview, tries to open the app, falls back to the App Store.
const APP_STORE_URL = "https://apps.apple.com/app/id6769178607";

module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>SnapShift — Shared Schedule</title>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;margin:0;background:#f5f5f7;color:#1d1d1f;padding:24px}
  .card{max-width:420px;margin:24px auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#6e6e73;font-size:14px;margin:0 0 16px}
  .day{font-weight:600;margin:14px 0 4px}.blk{padding:8px 10px;border-radius:8px;margin:4px 0;font-size:14px}
  .work{background:#2196F3;color:#fff}.busy{background:#e0e0e5;color:#3a3a3c}
  .cta{display:block;text-align:center;background:#2196F3;color:#fff;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;margin-top:18px}
</style></head>
<body><div class="card" id="card">
  <h1 id="title">Shared schedule</h1>
  <p class="muted" id="sub">Opening in SnapShift…</p>
  <div id="preview"></div>
  <a class="cta" href="${APP_STORE_URL}">Get SnapShift</a>
</div>
<script>
  var ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  function b64urlDecode(input){var lookup={};for(var i=0;i<ALPHABET.length;i++)lookup[ALPHABET[i]]=i;
    var bytes=[];for(var j=0;j<input.length;j+=4){var c0=lookup[input[j]],c1=lookup[input[j+1]],c2=lookup[input[j+2]],c3=lookup[input[j+3]];
    if(c0===undefined||c1===undefined)break;bytes.push((c0<<2)|(c1>>4));if(c2!==undefined)bytes.push(((c1&15)<<4)|(c2>>2));if(c3!==undefined)bytes.push(((c2&3)<<6)|c3);}
    return decodeURIComponent(escape(String.fromCharCode.apply(null,bytes)));}
  function param(n){var m=location.search.match(new RegExp("[?&]"+n+"=([^&#]+)"));return m?m[1]:null;}
  try{
    var d=param("d");var p=JSON.parse(b64urlDecode(d));
    document.getElementById("title").textContent=p.name+"'s week";
    document.getElementById("sub").textContent="Week of "+p.week;
    var byDay={};(p.shifts||[]).forEach(function(s){(byDay[s.date]=byDay[s.date]||[]).push({k:"work",t:s.start+"–"+s.end+(s.label?" · "+s.label:"")});});
    (p.busy||[]).forEach(function(b){(byDay[b.date]=byDay[b.date]||[]).push({k:"busy",t:b.allDay?"All day (busy)":b.start+"–"+b.end+" (busy)"});});
    var html="";Object.keys(byDay).sort().forEach(function(day){html+='<div class="day">'+day+'</div>';
      byDay[day].forEach(function(x){html+='<div class="blk '+x.k+'">'+x.t+'</div>';});});
    document.getElementById("preview").innerHTML=html||'<p class="muted">No events shared.</p>';
    window.location.href="snapshift://share-week?d="+d;
    setTimeout(function(){document.getElementById("sub").textContent="Have the app? Tap to open. Otherwise install below.";},1500);
  }catch(e){
    document.getElementById("sub").textContent="This link couldn't be read. Make sure you copied the whole thing.";
    document.getElementById("preview").innerHTML="";
  }
</script>
</body></html>`);
};
