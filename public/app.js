const RELEASES_API = "https://skylineenginestats.anesteb8.workers.dev/api/public/fivem/files";

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

function releaseCard(file, isLatest) {
  const version = file.version ? "v" + file.version.replace(/^v/i, "") : "Release";
  const category = file.category || "Application";
  const platform = file.platform || "Windows";
  const packageName = file.file_name || "Download package";
  const url = file.download_url || "";
  const downloadable = Number(file.downloadable) !== 0;
  const statusClass = downloadable ? "is-current" : "is-outdated";
  const statusText = downloadable ? "Download available" : "Download disabled";
  const downloadLabel = downloadable ? "Download" : "Unavailable";

  return `
    <article class="update-card ${statusClass}">
      <div class="update-card-content">
        <div class="update-card-top">
          <div>
            <span class="update-version">${escapeHtml(category)} · ${escapeHtml(version)}</span>
            <h3 class="update-title">${escapeHtml(file.name || "Untitled release")}</h3>
            <p class="update-description">${escapeHtml(file.description || "No description provided.")}</p>
          </div>
          <span class="update-status">${escapeHtml(statusText)}</span>
        </div>

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
          <div class="file-info-item">
            <span class="file-info-label">Package</span>
            <span class="file-info-value">${escapeHtml(packageName)}</span>
          </div>
          <div class="file-info-item">
            <span class="file-info-label">Type</span>
            <span class="file-info-value">${escapeHtml(category)}</span>
          </div>
          <div class="file-info-item">
            <span class="file-info-label">Platform</span>
            <span class="file-info-value">FiveM · ${escapeHtml(platform)}</span>
          </div>
        </div>

        <div class="license-key-box">
          <div class="license-key-copy">
            <span class="license-key-label">License Key</span>
            <code>${escapeHtml(file.license_key || "Not provided")}</code>
          </div>
          ${file.license_key ? `<button class="license-key-button" type="button" data-license-key="${escapeHtml(file.license_key)}">Copy</button>` : ""}
        </div>"}
        <div class="update-actions">
          ${url && downloadable
            ? `<a class="update-download" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${downloadLabel}</a>`
            : `<span class="update-download" aria-disabled="true">${downloadLabel}</span>`}
        </div>
      </div>

      ${!downloadable ? `
        <div class="outdated-overlay" aria-hidden="true">
          <div class="outdated-overlay-inner">
            <span class="outdated-icon">×</span>
            <strong>Download unavailable</strong>
            <span>This release is currently not downloadable.</span>
            ${url
              ? `<a class="outdated-continue" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Continue download</a>`
              : ""}
          </div>
        </div>` : ""}
    </article>`;
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
      .map((file) => releaseCard(file, false))
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
  const button = event.target.closest("[data-license-key]");
  if (!button) return;
  const key = button.dataset.licenseKey || "";
  if (!key) return;
  try {
    await navigator.clipboard.writeText(key);
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = original; }, 1400);
  } catch (_) {}
});
