import {createHash} from "node:crypto";
import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {SESSION_COOKIE} from "@/lib/server/auth";

export const runtime="nodejs";
export async function POST(){
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(token)await createAdminClient().from("app_sessions").delete().eq("token_hash",createHash("sha256").update(token).digest("hex"));
  const response=NextResponse.json({ok:true});
  response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  return response;
}