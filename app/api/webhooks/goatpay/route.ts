import {NextRequest} from "next/server";
import crypto from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {env} from "@/lib/env";
export const runtime="nodejs";
function authorized(req:NextRequest,raw:string){
 const secret=req.headers.get("x-webhook-secret")||req.headers.get("x-goatpay-webhook-secret")||"";
 if(secret&&secret.length===env.goatpayWebhookSecret.length&&crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(env.goatpayWebhookSecret)))return true;
 const signature=req.headers.get("x-goatpay-signature")||req.headers.get("x-webhook-signature")||"";if(!signature)return false;
 const expected=crypto.createHmac("sha256",env.goatpayWebhookSecret).update(raw).digest("hex");
 return signature===expected||signature==="sha256="+expected;
}
export async function POST(req:NextRequest){
 const raw=await req.text();if(!authorized(req,raw))return Response.json({error:"Invalid webhook signature"},{status:401});
 let body:Record<string,unknown>;try{body=JSON.parse(raw)}catch{return Response.json({error:"Invalid JSON"},{status:400})}
 const hash=typeof body.transaction_hash==="string"?body.transaction_hash:null;const status=typeof body.status==="string"?body.status.toLowerCase():"";
 const eventKey=hash?hash+":"+status+":"+String(body.paid_at||""):crypto.createHash("sha256").update(raw).digest("hex");
 const admin=createAdminClient();const existing=await admin.from("billing_events").select("id").eq("event_key",eventKey).maybeSingle();if(existing.data)return Response.json({ok:true,idempotent:true});
 const inserted=await admin.from("billing_events").insert({event_key:eventKey,transaction_hash:hash,payload:body});if(inserted.error)return Response.json({error:inserted.error.message},{status:500});
 const userId=typeof body.user_id==="string"?body.user_id:null;
 if(userId){
  const paid=["paid","approved","completed","complete","success"].includes(status);
  const plan=typeof body.plan==="string"&&["pro","r","ultra"].includes(body.plan)?body.plan:"pro";
  const now=new Date();const due=new Date(now);due.setMonth(due.getMonth()+1);const deadline=new Date(due);deadline.setDate(deadline.getDate()+14);
  const current=await admin.from("subscriptions").select("id").eq("user_id",userId).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const subscription={user_id:userId,plan,status:paid?"active":"past_due",paid_at:paid?now.toISOString():undefined,due_at:due.toISOString(),deadline_at:deadline.toISOString(),last_transaction_hash:hash,updated_at:now.toISOString()};
  if(current.data) await admin.from("subscriptions").update(subscription).eq("id",current.data.id);
  else await admin.from("subscriptions").insert(subscription);
  if(paid)await admin.from("profiles").update({plan}).eq("id",userId);
 }
 return Response.json({ok:true});
}