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
    const calUrl = "https://p152-caldav.icloud.com/published/2/MTA2MzQ3NjIxMjEwNjM0N4LByrBwLQCJeuYZk8N8eSWz-kXFfCrjPE6wiv_gej2t1-NE16Ciw3-i3BPwqcJuzafMYRDCm0Kg1NLqhFi69J4";

    const response = await fetch(calUrl, {
      headers: {
        "Accept": "text/calendar",
        "User-Agent": "CalendarApp/1.0",
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ ics: "", error: `HTTP ${response.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const ics = await response.text();
    return new Response(JSON.stringify({ ics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ics: "", error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
