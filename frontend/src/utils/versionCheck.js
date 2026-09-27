/**
 * Version checker — detects when frontend has been updated on the server
 * and triggers a page reload with a friendly message.
 *
 * Polls /version.json every 30 seconds AND on each route change.
 * If hash changes, shows a notification and reloads the page after 2 seconds.
 */

let currentHash = null;
let checkIntervalId = null;

async function getVersionHash() {
  try {
    const response = await fetch('/version.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.hash;
  } catch (error) {
    return null;
  }
}

async function checkAndReloadIfNeeded(onReloadDetected) {
  const newHash = await getVersionHash();

  if (newHash && currentHash && newHash !== currentHash) {
    if (onReloadDetected) onReloadDetected();

    // Auto-reload after 2 seconds
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
}

export function startVersionCheck(onReloadDetected) {
  if (checkIntervalId) return; // already running

  // Initial hash on page load
  getVersionHash().then((hash) => {
    currentHash = hash;
  });

  // Check every 10 seconds (faster detection on upload)
  checkIntervalId = setInterval(() => {
    checkAndReloadIfNeeded(onReloadDetected);
  }, 10000);

  // Check on each route change (popstate event)
  window.addEventListener('popstate', () => {
    checkAndReloadIfNeeded(onReloadDetected);
  });
}

export function stopVersionCheck() {
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
  window.removeEventListener('popstate', () => {});
}
