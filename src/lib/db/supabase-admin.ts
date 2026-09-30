import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string | null {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbUrl = process.env.DATABASE_URL ?? "";

  // Handle pooler URL: postgresql://postgres.<ref>@aws-0-...pooler.supabase.com:5432/postgres
  const poolerMatch = dbUrl.match(/postgres\.([a-z0-9]{20})/);
  if (poolerMatch?.[1]) return `https://${poolerMatch[1]}.supabase.co`;

  const m1 = dbUrl.match(/postgres\.([^.]+?)(?::|@|\.)/);
  if (m1?.[1] && m1[1] !== "pooler") return `https://${m1[1]}.supabase.co`;

  const m2 = dbUrl.match(/@db\.([^.]+)\.supabase/);
  if (m2?.[1]) return `https://${m2[1]}.supabase.co`;

  return null;
}

const supabaseUrl = getSupabaseUrl();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
