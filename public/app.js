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

function getLatestReleaseIndex(files) {
  if (!files.length) return -1;

  let latestIndex = 0;

  for (let i = 1; i < files.length; i += 1) {
    const versionComparison = compareVersions(files[i].version, files[latestIndex].version);

    if (
      versionComparison > 0 ||
      (versionComparison === 0 &&
        String(files[i].updated_at || "") > String(files[latestIndex].updated_at || ""))
    ) {
      latestIndex = i;
    }
  }

  return latestIndex;
}

function releaseCard(file, isLatest) {
  const version = file.version ? "v" + file.version.replace(/^v/i, "") : "Release";
  const category = file.category || "Application";
  const platform = file.platform || "Windows";
  const packageName = file.file_name || "Download package";
  const url = file.download_url || "";
  const statusClass = isLatest ? "is-current" : "is-outdated";
  const statusText = isLatest ? "Latest release" : "Outdated release";
  const downloadLabel = isLatest ? "Download" : "Continue download";

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

        <div class="update-actions">
          ${url
            ? `<a class="update-download" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${downloadLabel}</a>`
            : `<span class="update-download" aria-disabled="true">Download unavailable</span>`}
        </div>
      </div>

      ${!isLatest ? `
        <div class="outdated-overlay" aria-hidden="true">
          <div class="outdated-overlay-inner">
            <span class="outdated-icon">↗</span>
            <strong>Version outdated</strong>
            <span>A newer Skyline Engine release is available.</span>
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

    const latestIndex = getLatestReleaseIndex(files);
    const orderedFiles = files
      .map((file, index) => ({ file, index }))
      .sort((a, b) => {
        if (a.index === latestIndex) return -1;
        if (b.index === latestIndex) return 1;
        return String(b.file.updated_at || "").localeCompare(String(a.file.updated_at || ""));
      });

    container.innerHTML = orderedFiles
      .map(({ file, index }) => releaseCard(file, index === latestIndex))
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
