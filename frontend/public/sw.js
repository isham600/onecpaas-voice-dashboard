console.log("🔵 Service Worker Loaded");

self.addEventListener("install", (event) => {
  console.log("⚡ Service Worker Installed");
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker Activated");
  event.waitUntil(self.clients.claim()); // Take control of open pages
});

self.addEventListener("fetch", (event) => {
  console.log("📡 Fetch Event:", event.request.url);
});

// ✅ Correctly Handle Background Download Messages
self.addEventListener("message", async (event) => {
  if (event.data.action === "downloadCSV") {
    const { apiUrl, filename } = event.data;

    try {
      const response = await fetch(apiUrl);
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;

      const contentLength = response.headers.get("Content-Length");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;

        // ✅ Send progress update to all clients (Fix the Error)
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({
            action: "downloadProgress",
            progress: contentLength ? Math.round((receivedLength / contentLength) * 100) : null,
          }));
        });
      }

      // ✅ Send completion message
      const blob = new Blob(chunks, { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({
          action: "downloadComplete",
          url,
          filename,
        }));
      });

    } catch (error) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({
          action: "downloadError",
          error: error.message,
        }));
      });
    }
  }
});
