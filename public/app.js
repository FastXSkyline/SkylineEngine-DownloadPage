const RELEASES_API = "https://skylineenginestats.anesteb8.workers.dev/api/public/fivem/files";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function releaseCard(file) {
  const version = file.version ? "v" + file.version : "Release";
  const category = file.category || "Application";
  const platform = file.platform || "Windows";
  const packageName = file.file_name || "Download package";
  const url = file.download_url || "";

  return `
    <article class="update-card">
      <div class="update-card-top">
        <div>
          <span class="update-version">${escapeHtml(category)} · ${escapeHtml(version)}</span>
          <h3 class="update-title">${escapeHtml(file.name || "Untitled release")}</h3>
          <p class="update-description">${escapeHtml(file.description || "No description provided.")}</p>
        </div>
        <span class="update-status">Available</span>
      </div>
      <div class="update-meta">
        <div class="update-meta-item"><span class="update-meta-label">Version</span><span class="update-meta-value">${escapeHtml(file.version || "—")}</span></div>
        <div class="update-meta-item"><span class="update-meta-label">Category</span><span class="update-meta-value">${escapeHtml(category)}</span></div>
        <div class="update-meta-item"><span class="update-meta-label">Access</span><span class="update-meta-value">Direct download</span></div>
      </div>
      <div class="update-file-info">
        <div class="file-info-item"><span class="file-info-label">Package</span><span class="file-info-value">${escapeHtml(packageName)}</span></div>
        <div class="file-info-item"><span class="file-info-label">Type</span><span class="file-info-value">${escapeHtml(category)}</span></div>
        <div class="file-info-item"><span class="file-info-label">Platform</span><span class="file-info-value">FiveM · ${escapeHtml(platform)}</span></div>
      </div>
      <div class="update-actions">
        ${url ? `<a class="update-download" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Download</a>` : `<span class="update-download" aria-disabled="true">Download unavailable</span>`}
      </div>
    </article>`;
}

async function loadReleases() {
  const container = document.getElementById("fivemReleases");
  if (!container) return;

  try {
    const response = await fetch(RELEASES_API, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
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

    container.innerHTML = files.map(releaseCard).join("");
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
