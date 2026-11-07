async function proxy(request: Request) {
  const url = process.env.LOCUS_MAIL_REGISTRY_URL;

  if (!url) {
    return Response.json({ error: "Launch with locus-mail (npm run preview locally) to enable template discovery." }, { status: 503 });
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Template registry unavailable. Restart locus-mail." }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
