const RELEASES_API = "https://skylineenginestats.anesteb8.workers.dev/api/public/fivem/files";
let allReleases = [];
let activeReleaseCategory = "free-menu";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function versionParts(value) {
  const parts = String(value ?? "")
    .trim()
    .replace(/^v/i, "")
    .split(/[._+-]/)
    .map((part) => {
      const match = part.match(/^\d+/);
      return match ? Number(match[0]) : 0;
    });

  while (parts.length < 3) parts.push(0);
  return parts;
}

function compareVersions(a, b) {
  const aa = versionParts(a);
  const bb = versionParts(b);

  for (let i = 0; i < Math.max(aa.length, bb.length); i += 1) {
    const left = aa[i] || 0;
    const right = bb[i] || 0;
    if (left !== right) return left - right;
  }

  return 0;
}

function releaseCard(file) {
  const version = file.version ? "v" + file.version.replace(/^v/i, "") : "Release";
  const category = file.category || "Application";
  const platform = file.platform || "Windows";
  const packageName = file.file_name || "Download package";
  const url = file.download_url || "";
  const downloadable = Number(file.downloadable) !== 0;
  const statusClass = downloadable ? "is-current" : "is-outdated";
  const statusText = downloadable ? "Download available" : "Download disabled";
  const downloadLabel = downloadable ? "Download" : "Unavailable";
  const collapsedClass = downloadable ? "" : " is-collapsed";

  return `
    <article class="update-card ${statusClass}${collapsedClass}">
      <div class="update-card-content">
        <div class="update-card-summary">
          <div class="update-card-top">
            <div>
              <span class="update-version">${escapeHtml(category)} · ${escapeHtml(version)}</span>
              <h3 class="update-title">${escapeHtml(file.name || "Untitled release")}</h3>
              <p class="update-description">${escapeHtml(file.description || "No description provided.")}</p>
            </div>
            <span class="update-status">${escapeHtml(statusText)}</span>
          </div>
          ${!downloadable ? `<button class="release-toggle" type="button" aria-expanded="false">View release<span class="release-toggle-icon">⌄</span></button>` : ""}
        </div>

        <div class="update-card-details">
          <div class="update-meta">
            <div class="update-meta-item">
              <span class="update-meta-label">Version</span>
              <span class="update-meta-value">${escapeHtml(file.version || "—")}</span>
            </div>
            <div class="update-meta-item">
              <span class="update-meta-label">Category</span>
              <span class="update-meta-value">${escapeHtml(category)}</span>
            </div>
            <div class="update-meta-item">
              <span class="update-meta-label">Access</span>
              <span class="update-meta-value">Direct download</span>
            </div>
          </div>

          <div class="update-file-info">
            <div class="file-info-item"><span class="file-info-label">Package</span><span class="file-info-value">${escapeHtml(packageName)}</span></div>
            <div class="file-info-item"><span class="file-info-label">Type</span><span class="file-info-value">${escapeHtml(category)}</span></div>
            <div class="file-info-item"><span class="file-info-label">Platform</span><span class="file-info-value">FiveM · ${escapeHtml(platform)}</span></div>
          </div>

          <div class="license-key-box">
            <div class="license-key-copy"><span class="license-key-label">License Key</span><code>${escapeHtml(file.license_key || "Not provided")}</code></div>
            ${file.license_key ? `<button class="license-key-button" type="button" data-license-key="${escapeHtml(file.license_key)}">Copy</button>` : ""}
          </div>

          <div class="license-key-box rar-password-box">
            <div class="license-key-copy"><span class="license-key-label">RAR Password</span><code>${escapeHtml(file.rar_password || "Not provided")}</code></div>
            ${file.rar_password ? `<button class="license-key-button" type="button" data-rar-password="${escapeHtml(file.rar_password)}">Copy</button>` : ""}
          </div>

          <div class="update-actions">
            ${url && downloadable ? `<a class="update-download" href="${escapeHtml(url)}" data-download-id="${escapeHtml(file.id)}" target="_blank" rel="noopener noreferrer">${downloadLabel}</a>` : `<span class="update-download" aria-disabled="true">${downloadLabel}</span>`}
          </div>
        </div>
      </div>
    </article>`;
}
function releaseCategory(file) {
  const raw = `${file.category || ""} ${file.name || ""}`.toLowerCase();
  return raw.includes("fps") ? "fps-packs" : "free-menu";
}

function renderReleaseCategory() {
  const container = document.getElementById("fivemReleases");
  if (!container) return;
  const files = allReleases.filter((file) => releaseCategory(file) === activeReleaseCategory);
  if (!files.length) {
    container.innerHTML = `<div class="release-loading"><strong>No ${activeReleaseCategory === "fps-packs" ? "FPS packs" : "free menu"} published yet.</strong><span>Published releases in this category will appear here automatically.</span></div>`;
    return;
  }
  container.innerHTML = files.map((file) => releaseCard(file)).join("");
}

async function loadReleases() {
  const container = document.getElementById("fivemReleases");
  if (!container) return;

  try {
    const response = await fetch(RELEASES_API, {
      method: "GET",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data.error || "Request failed");
    const files = Array.isArray(data.files) ? data.files : [];

    if (!files.length) {
      container.innerHTML = `
        <div class="release-loading">
          <strong>No releases published yet.</strong>
          <span>Published FiveM files will appear here automatically.</span>
        </div>`;
      return;
    }

    const orderedFiles = files.slice().sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));

    container.innerHTML = orderedFiles
      .map((file) => releaseCard(file))
      .join("");
  } catch (error) {
    console.error("Failed to load releases:", error);
    container.innerHTML = `
      <div class="release-loading">
        <strong>Could not load releases.</strong>
        <span>Please refresh the page and try again.</span>
      </div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadReleases);


document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-license-key], [data-rar-password]");
  if (!button) return;
  const isRarPassword = button.hasAttribute("data-rar-password");
  const key = isRarPassword ? (button.dataset.rarPassword || "") : (button.dataset.licenseKey || "");
  if (!key) return;
  try {
    await navigator.clipboard.writeText(key);
    const original = button.textContent;
    button.textContent = "Copied";
    showCopyNotification(isRarPassword ? "RAR password copied" : "License key copied");
    setTimeout(() => { button.textContent = original; }, 1400);
  } catch (_) {}
});

function showCopyNotification(message) {
  let notification = document.getElementById("copyNotification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "copyNotification";
    notification.className = "copy-notification";
    notification.innerHTML = '<span class="copy-notification-icon">✓</span><span></span>';
    document.body.appendChild(notification);
  }
  notification.querySelector("span:last-child").textContent = message;
  notification.classList.remove("show");
  void notification.offsetWidth;
  notification.classList.add("show");
  clearTimeout(window.copyNotificationTimer);
  window.copyNotificationTimer = setTimeout(() => notification.classList.remove("show"), 2200);
}


document.addEventListener("click", async (event) => {
  const download = event.target.closest("[data-download-id]");
  if (download) {
    event.preventDefault();
    if (download.dataset.counting === "1") return;
    const id = download.dataset.downloadId || "";
    const targetUrl = download.href;
    download.dataset.counting = "1";
    download.setAttribute("aria-disabled", "true");

    try {
      const response = await fetch(`https://skylineenginestats.anesteb8.workers.dev/api/public/fivem/files/${encodeURIComponent(id)}/download`, {
        method: "POST",
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Download counter request failed");
    } catch (error) {
      console.error("Failed to record download:", error);
    } finally {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      download.dataset.counting = "0";
      download.removeAttribute("aria-disabled");
    }
    return;
  }

  const toggle = event.target.closest(".release-toggle");
  if (!toggle) return;
  const card = toggle.closest(".update-card");
  if (!card) return;

  const expanded = card.classList.toggle("is-expanded");
  card.classList.toggle("is-collapsed", !expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.innerHTML = expanded
    ? 'Hide release<span class="release-toggle-icon">⌃</span>'
    : 'View release<span class="release-toggle-icon">⌄</span>';
});


document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-release-category]");
  if (!tab) return;
  activeReleaseCategory = tab.dataset.releaseCategory || "free-menu";
  document.querySelectorAll(".release-tab").forEach((item) => {
    const selected = item === tab;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  renderReleaseCategory();
});
