async function proxy(request: Request) {
  const url = process.env.LOCUS_MAIL_REGISTRY_URL;

  if (!url) {
    console.error("Locus Mail: template discovery unavailable. Launch with locus-mail or npm run preview.");

    return Response.json({ error: "Launch with locus-mail (npm run preview locally) to enable template discovery." }, { status: 503 });
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });

    const body = await response.text();

    if (!response.ok) {
      console.error(`Locus Mail: ${request.method} /api/templates failed (${response.status}): ${body}`);
    }

    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Locus Mail: template registry unavailable. Restart locus-mail.");

    return Response.json({ error: "Template registry unavailable. Restart locus-mail." }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
