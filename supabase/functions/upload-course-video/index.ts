import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.556.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.556.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: authErr } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (authErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const email = (userData.user.email ?? "").toLowerCase();
    const adminEmails = (Deno.env.get("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!adminEmails.includes(email)) {
      return json({ error: "Admin access required" }, 403);
    }

    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucket = Deno.env.get("R2_BUCKET_NAME");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return json({
        error:
          "R2 credentials are not configured yet. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME to the Supabase Dashboard secrets.",
      }, 500);
    }

    const body = await req.json();
    const courseId = Number(body.course_id);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "video/mp4";
    const week = body.week != null && body.week !== "" ? Number(body.week) : null;
    const lessonOrder = body.lesson_order != null && body.lesson_order !== "" ? Number(body.lesson_order) : null;

    if (!courseId || !title) {
      return json({ error: "course_id and title are required" }, 400);
    }

    const safeName = (fileName || "lesson.mp4")
      .replace(/[^a-zA-Z0-9.\-_]/g, "-")
      .toLowerCase() || "lesson.mp4";

    const r2Key = `courses/${courseId}/${crypto.randomUUID()}-${safeName}`;

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 3600 });

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: lesson, error: insertErr } = await serviceClient
      .from("lessons")
      .insert({ course_id: courseId, title, r2_key: r2Key, week, lesson_order: lessonOrder })
      .select()
      .single();

    if (insertErr) {
      return json({ error: "Failed to register lesson: " + insertErr.message }, 500);
    }

    return json({ uploadUrl, r2Key, lessonId: lesson.id }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
