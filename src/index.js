const CACHE_TTL = 60;
let schemaPromise = null;

async function ensureFiveMSchema(db) {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await db.prepare(
      "CREATE TABLE IF NOT EXISTS fivem_files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, version TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', download_url TEXT NOT NULL DEFAULT '', file_name TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Application', platform TEXT NOT NULL DEFAULT 'Windows', published INTEGER NOT NULL DEFAULT 0, downloadable INTEGER NOT NULL DEFAULT 1, license_key TEXT NOT NULL DEFAULT '', rar_password TEXT NOT NULL DEFAULT '', download_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')))"
    ).run();

    await db.prepare("CREATE INDEX IF NOT EXISTS idx_fivem_files_published ON fivem_files(published)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_fivem_files_updated_at ON fivem_files(updated_at)").run();
  })();

  return schemaPromise;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders
    }
  });
}

async function listReleases(env) {
  await ensureFiveMSchema(env.DB);

  const result = await env.DB.prepare(
    "SELECT id, name, version, description, download_url, file_name, category, platform, downloadable, license_key, rar_password, created_at, updated_at FROM fivem_files WHERE published = 1 ORDER BY updated_at DESC, id DESC"
  ).all();

  return json(
    { files: result.results || [] },
    200,
    {
      "Cache-Control": "public, max-age=60, s-maxage=60"
    }
  );
}

async function incrementDownload(env, id) {
  const fileId = Number.parseInt(id, 10);

  if (!Number.isInteger(fileId) || fileId < 1) {
    return json({ error: "Invalid file id." }, 400);
  }

  await ensureFiveMSchema(env.DB);

  const result = await env.DB.prepare(
    "UPDATE fivem_files SET download_count = download_count + 1 WHERE id = ? AND published = 1 AND downloadable = 1"
  ).bind(fileId).run();

  if (!result.meta?.changes) {
    return json({ error: "Release not found or unavailable." }, 404);
  }

  const row = await env.DB.prepare(
    "SELECT download_count FROM fivem_files WHERE id = ?"
  ).bind(fileId).first();

  return json({
    success: true,
    downloadCount: Number(row?.download_count || 0)
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === "/api/releases" && request.method === "GET") {
      try {
        return await listReleases(env);
      } catch (error) {
        console.error("Failed to load releases:", error);
        return json({ error: "Failed to load releases." }, 500);
      }
    }

    if (
      url.pathname.startsWith("/api/releases/") &&
      url.pathname.endsWith("/download") &&
      request.method === "POST"
    ) {
      try {
        const id = url.pathname.split("/")[3];
        return await incrementDownload(env, id);
      } catch (error) {
        console.error("Failed to record download:", error);
        return json({ error: "Failed to record download." }, 500);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
