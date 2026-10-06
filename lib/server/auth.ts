import {createHash} from "node:crypto";
import {cookies} from "next/headers";
import {createAdminClient} from "@/lib/supabase/admin";

export const SESSION_COOKIE="traz_session";
function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}

export async function getAuthenticatedUserId(){
  const cookieStore=await cookies();
  const token=cookieStore.get(SESSION_COOKIE)?.value;
  if(!token)return null;
  const supabase=createAdminClient();
  const session=await supabase.from("app_sessions").select("user_id,expires_at").eq("token_hash",hashToken(token)).maybeSingle();
  if(session.error||!session.data)return null;
  if(new Date(session.data.expires_at).getTime()<=Date.now()){
    await supabase.from("app_sessions").delete().eq("token_hash",hashToken(token));
    return null;
  }
  return {supabase,userId:session.data.user_id};
}