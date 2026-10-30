const files = ["rt", "display", "audio", "flash", "boot", "debug"];

function showBootError(error) {
  const boot = document.getElementById("boot");
  const message = document.getElementById("bootmsg");
  if (!boot || !message) return;
  boot.classList.add("failed");
  boot.style.display = "block";
  message.textContent = "Couldn't start. Click to reload.";
  boot.title = String(error);
  boot.onclick = () => window.location.reload();
}

try {
  for (const file of files) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `js/${file}.js`;
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`Loading js/${file}.js timed out`));
      }, 30000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => {
        clearTimeout(timer);
        reject(new Error(`Could not load js/${file}.js`));
      };
      document.body.appendChild(script);
    });
  }
} catch (error) {
  console.error("[startup]", error);
  showBootError(error);
}
