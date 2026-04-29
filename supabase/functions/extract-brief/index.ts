// Extracts structured deliverables from any brief source:
//  - text:    free-form text the user typed
//  - csv:     pasted CSV / Excel-exported rows
//  - sheet:   public Google Sheet URL (uses Sheets API v4 public endpoint w/ no key via export?format=csv)
//  - doc:     base64-encoded PDF / image / docx (Gemini multimodal)
//  - audio:   base64-encoded voice recording (Gemini multimodal)
//
// Output is always the same shape: { project: { title, summary }, deliverables: [...] }
// so the frontend can review and bulk-insert into project_deliverables.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Source = "text" | "csv" | "sheet" | "doc" | "audio";

interface MoodboardItem {
  url: string;                 // link to image, Pinterest, IG, Behance, Drive, etc.
  thumbnail_url?: string | null; // direct image URL if known (used for card preview)
  caption?: string | null;
  kind?: "image" | "link" | "video" | null;
}

interface DeliverableOut {
  title: string;
  description?: string;
  due_date?: string | null; // ISO date
  reference_url?: string | null;        // legacy single ref (kept for back-compat)
  references?: MoodboardItem[];         // NEW: full moodboard
  notes?: string | null;
}

interface BriefOut {
  project: { title: string; summary: string };
  deliverables: DeliverableOut[];
}

const SYSTEM_PROMPT = `You convert a creative project brief into a structured deliverables list with VISUAL references.

Output STRICT JSON matching this TypeScript type:
{
  "project": { "title": string, "summary": string },
  "deliverables": Array<{
    "title": string,            // short imperative, e.g. "Instagram carousel - launch day"
    "description": string,      // 1-3 sentences of context, including style/mood notes
    "due_date": string | null,  // ISO YYYY-MM-DD or null
    "references": Array<{       // moodboard for THIS deliverable (can be empty)
      "url": string,            // ANY URL found in the source row: image, Pinterest, IG post, Behance, YouTube, Drive, Dropbox, Figma, web link
      "thumbnail_url": string | null, // ONLY if it ends in .jpg/.jpeg/.png/.webp/.gif (a direct image). Otherwise null.
      "caption": string | null, // short label like "Color palette", "Mood reference", "Brand example"
      "kind": "image" | "link" | "video" | null
    }>,
    "notes": string | null
  }>
}

Rules:
- Every distinct asset, post, scene, deliverable, or task = ONE row.
- If the source is a spreadsheet, treat each ROW as one deliverable. Map columns intelligently:
    Title/Name/Asset → title
    Description/Brief/Notes/Concept → description
    Due/Deadline/Date → due_date
    Reference/Link/Inspo/Inspiration/Moodboard/Image/Visual → references[] (collect ALL URLs from those columns; one row may have many)
- If a single cell contains multiple URLs (separated by commas, newlines, spaces), split them and add each as its own reference.
- A URL ending in .jpg, .jpeg, .png, .webp, .gif is a direct image — set thumbnail_url to the same URL and kind="image".
- A URL containing youtube.com, youtu.be, vimeo.com → kind="video", thumbnail_url=null.
- Otherwise kind="link", thumbnail_url=null.
- Never invent references that aren't in the source.
- Keep titles under 80 chars.
- Return ONLY the JSON object, no prose, no markdown fences.`;

async function fetchPublicSheetAsCsv(url: string): Promise<string> {
  // Convert any Google Sheets URL into the CSV export endpoint.
  // Works for "anyone with link can view" sheets without OAuth.
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("Not a valid Google Sheets URL");
  const id = match[1];
  const gidMatch = url.match(/[#?&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  const res = await fetch(exportUrl);
  if (!res.ok) {
    throw new Error(
      `Could not read the sheet (status ${res.status}). Make sure it is shared as "Anyone with the link — Viewer".`,
    );
  }
  return await res.text();
}

async function callGemini(parts: unknown[], apiKey: string): Promise<BriefOut> {
  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: parts },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");
  let parsed: BriefOut;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch (_e) {
    throw new Error("AI returned invalid JSON");
  }
  if (!parsed?.deliverables || !Array.isArray(parsed.deliverables)) {
    throw new Error("AI response missing deliverables array");
  }
  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const source: Source = body.source;
    const projectTitle: string | undefined = body.project_title;

    if (!source) {
      return new Response(JSON.stringify({ error: "source is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parts: unknown[] = [];
    const ctx = projectTitle ? `Existing project title (for context): "${projectTitle}".\n\n` : "";

    if (source === "text") {
      const text: string = body.text ?? "";
      if (!text.trim()) throw new Error("text is required for source=text");
      parts = [{ type: "text", text: `${ctx}Brief (free-form):\n\n${text}` }];
    } else if (source === "csv") {
      const csv: string = body.csv ?? "";
      if (!csv.trim()) throw new Error("csv is required for source=csv");
      parts = [{
        type: "text",
        text: `${ctx}Brief delivered as CSV/spreadsheet rows. Treat each row (after the header) as ONE deliverable:\n\n${csv}`,
      }];
    } else if (source === "sheet") {
      const url: string = body.url ?? "";
      if (!url) throw new Error("url is required for source=sheet");
      const csv = await fetchPublicSheetAsCsv(url);
      parts = [{
        type: "text",
        text: `${ctx}Brief delivered as a public Google Sheet (exported to CSV). Treat each row as ONE deliverable:\n\n${csv}`,
      }];
    } else if (source === "doc") {
      const dataBase64: string = body.data_base64 ?? "";
      const mimeType: string = body.mime_type ?? "application/pdf";
      if (!dataBase64) throw new Error("data_base64 is required for source=doc");
      parts = [
        {
          type: "text",
          text: `${ctx}Brief delivered as an uploaded document. Extract all deliverables from it.`,
        },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${dataBase64}` },
        },
      ];
    } else if (source === "audio") {
      const dataBase64: string = body.data_base64 ?? "";
      const mimeType: string = body.mime_type ?? "audio/webm";
      if (!dataBase64) throw new Error("data_base64 is required for source=audio");
      parts = [
        {
          type: "text",
          text: `${ctx}Brief delivered as a voice memo. Transcribe and extract deliverables.`,
        },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${dataBase64}` },
        },
      ];
    } else {
      throw new Error(`Unknown source: ${source}`);
    }

    const result = await callGemini(parts, LOVABLE_API_KEY);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("extract-brief error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
