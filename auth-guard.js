/*
 * auth-guard.js  —  SCRUM-21 (secure session client guard)
 *
 * Include on any page that requires the user to be logged in:
 *   <script defer src="auth-guard.js"></script>
 *
 * Behaviour:
 *   - Calls GET /api/me on page load.
 *   - If no valid session, redirects to login.html.
 *   - If logged in, exposes window.__currentUser and fills any element
 *     with id="currentUserLabel" with the user's name and role.
 *   - Exposes a global logout() function for logout buttons.
 */
(function () {
  const isBackendOrigin =
    window.location.protocol === "http:" &&
    window.location.hostname === "127.0.0.1" &&
    window.location.port === "5000";
  const apiBase = isBackendOrigin ? "" : "http://127.0.0.1:5000";

  async function checkSession() {
    try {
      const res = await fetch(apiBase + "/api/me", { credentials: "include" });
      if (!res.ok) {
        window.location.href = "login.html";
        return;
      }
      const data = await res.json();
      window.__currentUser = data.user;

      const label = document.getElementById("currentUserLabel");
      if (label) {
        label.textContent = `${data.user.name} (${data.user.role})`;
      }
      document.dispatchEvent(new CustomEvent("authReady", { detail: data.user }));
    } catch (err) {
      window.location.href = "login.html";
    }
  }

  window.logout = async function () {
    try {
      await fetch(apiBase + "/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // ignored: still redirect to login
    }
    window.location.href = "login.html";
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkSession);
  } else {
    checkSession();
  }
})();
