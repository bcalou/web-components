function handleInstallPrompt() {
  const $todoApp = document.querySelector("todo-app");

  if (!$todoApp) return;

  let installPrompt;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    $todoApp.setAttribute("show-install-button", "true");

    console.info("beforeinstallprompt event fired");
  });

  $todoApp.addEventListener("install", async () => {
    if (!installPrompt) return;

    const result = await installPrompt.prompt();
    console.info("Install prompt result", result);

    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        console.info("Notifications granted");
      } else {
        console.info("Notifications refusées");
      }
    });

    installPrompt = null;
    $todoApp.removeAttribute("show-install-button");
  });
}

handleInstallPrompt();

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.info("Service worker registration", registration);
  }
}

registerServiceWorker();
