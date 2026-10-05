import {NextRequest} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const secret=process.env.TRAZ_INTERNAL_SECRET;if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return Response.json({error:"Unauthorized"},{status:401});
 const admin=createAdminClient();const now=new Date().toISOString();
 const overdue=await admin.from("subscriptions").select("user_id,id,status,deadline_at").lt("deadline_at",now).in("status",["active","grace","past_due"]);
 if(overdue.error)return Response.json({error:overdue.error.message},{status:500});
 for(const sub of overdue.data||[]){await admin.from("subscriptions").update({status:"canceled",updated_at:now}).eq("id",sub.id);await admin.from("profiles").update({plan:"free"}).eq("id",sub.user_id);}
 const grace=await admin.from("subscriptions").select("id,due_at").lt("due_at",now).eq("status","active");
 if(grace.error)return Response.json({error:grace.error.message},{status:500});
 for(const sub of grace.data||[]){await admin.from("subscriptions").update({status:"grace",updated_at:now}).eq("id",sub.id);}
 return Response.json({ok:true,canceled:overdue.data?.length||0,grace:grace.data?.length||0});
}
