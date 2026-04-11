import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_CAL_URL = "https://p152-caldav.icloud.com/published/2/MTA2MzQ3NjIxMjEwNjM0N4LByrBwLQCJeuYZk8N8eSWz-kXFfCrjPE6wiv_gej2t1-NE16Ciw3-i3BPwqcJuzafMYRDCm0Kg1NLqhFi69J4";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let calUrl = DEFAULT_CAL_URL;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.calendarUrl) {
          calUrl = body.calendarUrl.replace(/^webcal:\/\//, "https://");
        }
      } catch {
        // use default
      }
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      const param = url.searchParams.get("calendarUrl");
      if (param) calUrl = param.replace(/^webcal:\/\//, "https://");
    }

    const attempts = [
      { url: calUrl, ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      { url: calUrl, ua: "CalendarApp/1.0" },
    ];

    for (const attempt of attempts) {
      const response = await fetch(attempt.url, {
        method: "GET",
        headers: {
          "Accept": "text/calendar, text/plain, */*",
          "User-Agent": attempt.ua,
        },
        redirect: "follow",
      });

      if (response.ok) {
        const ics = await response.text();
        if (ics.includes("BEGIN:VCALENDAR")) {
          return new Response(JSON.stringify({ ics }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const status = response.status;
      const body = await response.text().catch(() => "");
      if (status !== 200) {
        return new Response(JSON.stringify({ ics: "", error: `HTTP ${status}`, detail: body.slice(0, 200) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ ics: "", error: "No valid calendar data found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ics: "", error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
