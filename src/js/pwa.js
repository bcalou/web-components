(function () {
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
    console.log("Install prompt result", result);

    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        console.log("Notifications granted");
      } else {
        console.log("Notifications refusées");
      }
    });

    installPrompt = null;
    $todoApp.removeAttribute("show-install-button");
  });
})();
