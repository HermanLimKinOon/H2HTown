import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.556.0";
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: authErr } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (authErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const lessonId = Number(body.lesson_id);
    if (!lessonId) return json({ error: "lesson_id is required" }, 400);

    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (memberErr) return json({ error: "Member lookup failed" }, 500);
    if (!member) return json({ error: "Member not found" }, 403);

    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("id, course_id, r2_key")
      .eq("id", lessonId)
      .maybeSingle();
    if (lessonErr) return json({ error: "Lesson lookup failed" }, 500);
    if (!lesson) return json({ error: "Lesson not found" }, 404);

    // Entitlement check: the member just needs at least one completed course
    // order. Don't use .single()/.maybeSingle() here — a member can have more
    // than one matching order (re-purchase, duplicate rows), and those helpers
    // raise PGRST116 ("multiple rows returned") on 2+ matches.
    const { data: orders, error: orderErr } = await supabase
      .from("member_orders")
      .select("id")
      .eq("member_id", member.id)
      .eq("order_type", "course")
      .eq("item_id", lesson.course_id)
      .eq("status", "completed")
      .limit(1);
    if (orderErr) return json({ error: "Order check failed" }, 500);
    if (!orders || orders.length === 0) return json({ error: "Not purchased" }, 403);

    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucket = Deno.env.get("R2_BUCKET_NAME");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return json({ error: "R2 credentials are not configured yet" }, 500);
    }

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: lesson.r2_key });
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

    return json({ url, lessonId: lesson.id, courseId: lesson.course_id }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
