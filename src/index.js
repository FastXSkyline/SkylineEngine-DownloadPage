const CACHE_TTL = 30;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/releases" && request.method === "GET") {
      try {
        const result = await env.DB
          .prepare(`
            SELECT
              id,
              name,
              version,
              description,
              download_url,
              file_name,
              category,
              platform,
              downloadable,
              license_key,
              rar_password,
              created_at,
              updated_at
            FROM fivem_files
            WHERE published = 1
            ORDER BY updated_at DESC, id DESC
          `)
          .all();

        return new Response(
          JSON.stringify({
            files: result.results || []
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=30, s-maxage=30",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Failed to load releases."
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
