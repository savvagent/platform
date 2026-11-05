/*
  Follow the operating system's light or dark setting. The shared console theme
  (@savvagent/console-ui) makes dark mode a `.dark` class on <html> and leaves
  the policy to each console; the platform follows the OS.

  A file rather than an inline script, so a `script-src 'self'` policy can
  allow it. Loaded blocking, in <head>, so the class is set before first paint:
  otherwise a dark-mode visitor would see each prerendered page flash light.
*/
(function () {
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
})();
