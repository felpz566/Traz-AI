import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";

export async function GET(){
 const checks={
  supabase:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY),
  ai:Boolean(process.env.GEMINI_API_TOKEN),
  billing:Boolean(process.env.GOATPAY_API_TOKEN&&process.env.GOATPAY_WEBHOOK_SECRET),
 };
 let database=false;
 if(checks.supabase){
  try{
   const admin=createAdminClient();
   const result=await admin.from("profiles").select("id",{head:true,count:"exact"});
   database=!result.error;
  }catch{database=false}
 }
 const all={...checks,database};
 const healthy=Object.values(all).every(Boolean);
 return NextResponse.json(
  {status:healthy?"ok":"degraded",service:"traz-ai",checks:all,timestamp:new Date().toISOString()},
  {status:healthy?200:503,headers:{"Cache-Control":"no-store"}},
 );
}