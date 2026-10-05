import type {SupabaseClient} from "@supabase/supabase-js";
import {USAGE_LIMITS,type UsageMetric} from "./limits";
export async function getPlan(supabase:SupabaseClient,userId:string){
 const r=await supabase.from("profiles").select("plan").eq("id",userId).maybeSingle();
 const p=r.data?.plan;return p&&p in USAGE_LIMITS?p as keyof typeof USAGE_LIMITS:"free";
}
export async function consumeUsage(supabase:SupabaseClient,userId:string,metric:UsageMetric,quantity=1){
 const plan=await getPlan(supabase,userId);const limit=USAGE_LIMITS[plan][metric];
 const r=await supabase.rpc("consume_usage_atomic",{p_user_id:userId,p_metric:metric,p_quantity:quantity,p_limit:limit});
 if(r.error)throw new Error(r.error.message);
 const row=Array.isArray(r.data)?r.data[0]:r.data;
 return {allowed:Boolean(row?.allowed),plan,used:Number(row?.used??0),limit:Number(row?.limit_value??limit)};
}