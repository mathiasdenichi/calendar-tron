import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const token = "B2I55Z2WMGuSye2";
    const streamUrl = `https://p26-sharedstreams.icloud.com/${token}/sharedstreams/webstream`;

    const response = await fetch(streamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamCtag: null }),
    });

    if (!response.ok) {
      const altUrl = `https://p34-sharedstreams.icloud.com/${token}/sharedstreams/webstream`;
      const altResponse = await fetch(altUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamCtag: null }),
      });
      if (!altResponse.ok) {
        return new Response(JSON.stringify({ photos: [], error: "Failed to fetch iCloud photos" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      const data = await altResponse.json();
      return new Response(JSON.stringify(processPhotos(data)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(processPhotos(data)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ photos: [], error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});

function processPhotos(data: Record<string, unknown>) {
  if (!data || !data.photos) return { photos: [] };

  const photos = (data.photos as Record<string, unknown>[]).map((photo) => {
    const derivatives = photo.derivatives as Record<string, { url?: string; width?: number; height?: number }>;
    if (!derivatives) return null;

    const sizes = Object.values(derivatives).sort((a, b) => (b.width || 0) - (a.width || 0));
    const best = sizes[0];
    const thumb = sizes[sizes.length - 1] || best;

    return {
      guid: photo.photoGuid,
      url: best?.url || null,
      thumbUrl: thumb?.url || null,
      width: best?.width || 0,
      height: best?.height || 0,
    };
  }).filter(Boolean);

  return { photos };
}
