async function proxy(request: Request) {
  const url = process.env.LOCUS_MAIL_REGISTRY_URL;

  if (!url) {
    console.error("Locus Mail: template discovery unavailable. Launch with locus-mail or npm run preview.");

    return Response.json({ error: "Launch with locus-mail (npm run preview locally) to enable template discovery." }, { status: 503 });
  }

  try {
    const body = request.method === "POST" ? await request.text() : undefined;

    if (body && JSON.parse(body).action === "send-test") {
      if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) {
        return Response.json({ error: "Test emails must be sent from this preview page." }, { status: 403 });
      }
    }

    const response = await fetch(url, {
      method: request.method,
      body,
      headers: { Authorization: `Bearer ${process.env.LOCUS_MAIL_REGISTRY_TOKEN ?? ""}` },
      cache: "no-store",
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error(`Locus Mail: ${request.method} /api/templates failed (${response.status}): ${responseBody}`);
    }

    return new Response(responseBody, {
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
