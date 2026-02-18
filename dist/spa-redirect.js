// GitHub Pages SPA redirect handling
// This script is intentionally external to comply with Content-Security-Policy (script-src 'self').
// Inline scripts are blocked by CSP; loading from 'self' is permitted.

// Check if this is a redirect from 404.html (sessionStorage approach)
(function() {
  var redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    history.replaceState(null, null, redirect);
  }
})();

// Handle redirects from 404.html via query parameter (?p=<path>)
(function() {
  var l = window.location;
  if (l.search) {
    var q = {};
    l.search.slice(1).split('&').forEach(function(v) {
      var a = v.split('=');
      q[a[0]] = a.slice(1).join('=').replace(/~and~/g, '&');
    });
    if (q.p !== undefined) {
      window.history.replaceState(null, null,
        l.pathname.slice(0, -1) + (q.p || '') +
        (q.q ? ('?' + q.q) : '') +
        l.hash
      );
    }
  }
})();
