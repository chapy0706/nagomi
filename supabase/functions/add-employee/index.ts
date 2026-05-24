import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // service_role のみ許可（JWTペイロードの role を確認）
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const token = authHeader.slice(7);
    const [, payloadPart] = token.split(".");
    const payload = JSON.parse(atob(payloadPart)) as { role?: string };
    if (payload.role !== "service_role") {
      return json({ error: "Forbidden: service_role が必要です" }, 403);
    }
  } catch {
    return json({ error: "Unauthorized: invalid token" }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: { employee_id?: unknown; display_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "リクエストボディのパースに失敗しました" }, 400);
  }

  const { employee_id, display_name } = body;

  if (typeof employee_id !== "string" || !/^[0-9]{9}$/.test(employee_id)) {
    return json({ error: "employee_id は9桁の数値である必要があります" }, 400);
  }

  if (typeof display_name !== "string" || display_name.trim().length === 0) {
    return json({ error: "display_name は必須です" }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from("employees")
    .insert({ employee_id, display_name: display_name.trim(), is_active: true })
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation（社員ID重複）
    const status = error.code === "23505" ? 409 : 400;
    return json({ error: error.message }, status);
  }

  return json({ employee: data }, 201);
});
