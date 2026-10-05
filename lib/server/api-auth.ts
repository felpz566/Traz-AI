import {NextRequest} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {hashApiKey} from "@/lib/api-keys";
export async function getApiUserId(request:NextRequest){
 const header=request.headers.get("authorization")||"";if(!header.toLowerCase().startsWith("bearer "))return null;
 const key=header.slice(7).trim();if(!key)return null;const admin=createAdminClient();
 const r=await admin.from("api_keys").select("id,user_id").eq("key_hash",hashApiKey(key)).is("revoked_at",null).maybeSingle();if(!r.data)return null;
 await admin.from("api_keys").update({last_used_at:new Date().toISOString()}).eq("id",r.data.id);return{userId:r.data.user_id,admin};
}