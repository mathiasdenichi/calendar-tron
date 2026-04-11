import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_TOKEN = "B2I55Z2WMGuSye2";

const ICLOUD_HEADERS = {
  "Content-Type": "application/json",
  "Origin": "https://www.icloud.com",
  "Referer": "https://www.icloud.com/",
};

async function fetchWebstream(baseUrl: string): Promise<{ data: Record<string, unknown>; baseUrl: string } | null> {
  const res = await fetch(`${baseUrl}/webstream`, {
    method: "POST",
    headers: ICLOUD_HEADERS,
    body: JSON.stringify({ streamCtag: null }),
  });

  if (res.status === 330) {
    const data = await res.json();
    const host = data["X-Apple-MMe-Host"] as string | undefined;
    if (!host) return null;
    const redirectBase = `https://${host}/${DEFAULT_TOKEN}/sharedstreams`;
    const redirectRes = await fetch(`${redirectBase}/webstream`, {
      method: "POST",
      headers: ICLOUD_HEADERS,
      body: JSON.stringify({ streamCtag: null }),
    });
    if (redirectRes.ok) return { data: await redirectRes.json(), baseUrl: redirectBase };
    return null;
  }

  if (res.ok) return { data: await res.json(), baseUrl };
  return null;
}

async function fetchAssetUrls(
  baseUrl: string,
  photoGuids: string[]
): Promise<Record<string, { url_location: string; url_path: string }>> {
  const res = await fetch(`${baseUrl}/webasseturls`, {
    method: "POST",
    headers: ICLOUD_HEADERS,
    body: JSON.stringify({ photoGuids }),
  });
  if (!res.ok) return {};
  const data = await res.json() as { items?: Record<string, { url_location: string; url_path: string }> };
  return data.items || {};
}

async function uploadPhotoToStorage(
  supabase: ReturnType<typeof createClient>,
  guid: string,
  url: string
): Promise<string | null> {
  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) return null;
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const storagePath = `icloud/${guid}.${ext}`;
    const imgBytes = await imgRes.arrayBuffer();

    const { error: uploadErr } = await supabase.storage
      .from("slideshow-photos")
      .upload(storagePath, imgBytes, { contentType, upsert: true });

    if (uploadErr) return null;

    const { data: urlData } = supabase.storage
      .from("slideshow-photos")
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let token = DEFAULT_TOKEN;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.token) token = body.token;
      } catch {
        // use default
      }
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      const param = url.searchParams.get("token");
      if (param) token = param;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const servers = ["p23", "p26", "p34", "p58", "p66"];
    let streamData: Record<string, unknown> | null = null;
    let resolvedBaseUrl = "";

    for (const server of servers) {
      const baseUrl = `https://${server}-sharedstreams.icloud.com/${token}/sharedstreams`;
      try {
        const result = await fetchWebstream(baseUrl);
        if (result) {
          streamData = result.data;
          resolvedBaseUrl = result.baseUrl;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!streamData || !streamData.photos) {
      return new Response(
        JSON.stringify({ synced: 0, total: 0, error: "Could not reach iCloud shared stream" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const photos = streamData.photos as Record<string, unknown>[];
    const photoGuids = photos.map((p) => p.photoGuid as string).filter(Boolean);
    const assetItems = await fetchAssetUrls(resolvedBaseUrl, photoGuids);

    const guidToDerivatives: Record<string, Record<string, { checksum: string; width?: number; height?: number; fileSize?: number }>> = {};
    for (const photo of photos) {
      const guid = photo.photoGuid as string;
      const derivatives = photo.derivatives as Record<string, { checksum: string; width?: number; height?: number; fileSize?: number }> | undefined;
      if (!guid || !derivatives) continue;
      guidToDerivatives[guid] = derivatives;
    }

    const checksumToUrl: Record<string, string> = {};
    for (const [checksum, asset] of Object.entries(assetItems)) {
      if (asset.url_location && asset.url_path) {
        checksumToUrl[checksum] = `https://${asset.url_location}${asset.url_path}`;
      }
    }

    const { data: existingRows } = await supabase
      .from("slideshow_photos")
      .select("guid, storage_url");
    const existingMap = new Map(
      (existingRows || []).map((r: { guid: string; storage_url: string | null }) => [r.guid, r.storage_url])
    );

    const upsertRows: {
      guid: string;
      original_url: string;
      thumb_url: string;
      storage_url: string | null;
      width: number;
      height: number;
      synced_at: string;
    }[] = [];

    const newGuids: { guid: string; url: string }[] = [];

    for (const guid of photoGuids) {
      const derivatives = guidToDerivatives[guid];
      if (!derivatives) continue;

      const sorted = Object.values(derivatives).sort(
        (a, b) => (b.fileSize || b.width || 0) - (a.fileSize || a.width || 0)
      );
      const best = sorted[0];
      const thumb = sorted[sorted.length - 1] || best;

      const bestUrl = best?.checksum ? checksumToUrl[best.checksum] : null;
      const thumbUrl = thumb?.checksum ? checksumToUrl[thumb.checksum] : null;

      if (!bestUrl) continue;

      const existingStorageUrl = existingMap.has(guid) ? existingMap.get(guid) : undefined;

      upsertRows.push({
        guid,
        original_url: bestUrl,
        thumb_url: thumbUrl || bestUrl,
        storage_url: existingStorageUrl || null,
        width: best?.width || 0,
        height: best?.height || 0,
        synced_at: new Date().toISOString(),
      });

      if (!existingMap.has(guid)) {
        newGuids.push({ guid, url: bestUrl });
      }
    }

    if (upsertRows.length > 0) {
      await supabase
        .from("slideshow_photos")
        .upsert(upsertRows, { onConflict: "guid" });
    }

    EdgeRuntime.waitUntil(
      (async () => {
        for (const { guid, url } of newGuids) {
          const storageUrl = await uploadPhotoToStorage(supabase, guid, url);
          if (storageUrl) {
            await supabase
              .from("slideshow_photos")
              .update({ storage_url: storageUrl })
              .eq("guid", guid);
          }
        }
      })()
    );

    return new Response(
      JSON.stringify({ synced: upsertRows.length, total: photoGuids.length, new: newGuids.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ synced: 0, total: 0, error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
