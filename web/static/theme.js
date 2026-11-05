/*
  Follow the operating system's light or dark setting. The platform follows the
  OS because the shared console theme leaves that policy to each console.

  This is a file rather than an inline script because the Content Security
  Policy is `script-src 'self'`, which refuses inline scripts. It is loaded
  blocking, in <head>, so the class is set before first paint: without that,
  prerendered pages would flash the light theme before switching to dark.
*/
try {
  var query = window.matchMedia('(prefers-color-scheme: dark)');
  var apply = function () {
    document.documentElement.classList.toggle('dark', query.matches);
  };
  apply();
  query.addEventListener('change', apply);
} catch (e) {
  // No matchMedia (an old browser): keep the light theme.
}
