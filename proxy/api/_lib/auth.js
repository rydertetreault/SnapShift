// proxy/api/_lib/auth.js
// Shared-secret gate for the proxy. Rate limiting now lives in ./rate-limit.js
// (the old in-memory limiter here never worked across serverless instances).

function checkAuth(req, res) {
  const expected = process.env.PROXY_SHARED_SECRET;
  if (!expected) {
    res.status(500).json({ error: "Server misconfigured" });
    return false;
  }
  const got = req.headers.authorization;
  if (got !== `Bearer ${expected}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

module.exports = { checkAuth };
