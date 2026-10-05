import {getAuthenticatedUserId} from "@/lib/server/auth";
import {USAGE_LIMITS} from "@/lib/usage/limits";
export async function GET(){
 const auth=await getAuthenticatedUserId(); if(!auth)return Response.json({error:"Unauthorized"},{status:401});
 const profile=await auth.supabase.from("profiles").select("plan").eq("id",auth.userId).maybeSingle();
 const plan=(profile.data?.plan||"free") as keyof typeof USAGE_LIMITS;
 const since=new Date(); since.setDate(1); since.setHours(0,0,0,0);
 const events=await auth.supabase.from("usage_events").select("metric,quantity").eq("user_id",auth.userId).gte("created_at",since.toISOString());
 const usage={messages:0,files:0,projects:0,agents:0};
 for(const e of events.data||[]){if(e.metric in usage)usage[e.metric as keyof typeof usage]+=e.quantity;}
 return Response.json({plan,periodStart:since.toISOString(),usage,limits:USAGE_LIMITS[plan]});
}
