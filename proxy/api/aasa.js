// proxy/api/aasa.js
// Apple App Site Association — served at /.well-known/apple-app-site-association.
// Tells iOS that https links to /s/* should open SnapShift directly via
// Universal Links instead of bouncing through Safari. Must be served as
// application/json (NOT application/octet-stream) and with no redirects.
const TEAM_ID = "UKV6C58N32";
const BUNDLE_ID = "dev.rydertetreault.snapshift";

module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).json({
    applinks: {
      details: [
        {
          appIDs: [`${TEAM_ID}.${BUNDLE_ID}`],
          components: [{ "/": "/s/*" }],
        },
      ],
    },
  });
};
