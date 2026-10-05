import {NextRequest} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {indexMemory} from "@/lib/memory/semantic";
const SCOPES=new Set(["conversation","project","user"]);
export async function GET(){const auth=await getAuthenticatedUserId();if(!auth)return Response.json({error:"Unauthorized"},{status:401});const r=await auth.supabase.from("memories").select("*").eq("user_id",auth.userId).order("updated_at",{ascending:false});if(r.error)return Response.json({error:r.error.message},{status:500});return Response.json({data:r.data});}
export async function POST(request:NextRequest){
 const auth=await getAuthenticatedUserId();if(!auth)return Response.json({error:"Unauthorized"},{status:401});
 const body=await request.json().catch(()=>({}));if(typeof body.content!=="string"||!body.content.trim())return Response.json({error:"content is required"},{status:400});
 const scope=typeof body.scope==="string"&&SCOPES.has(body.scope)?body.scope:"user";const scopeId=typeof body.scopeId==="string"?body.scopeId:null;
 if((scope==="conversation"||scope==="project")&&!scopeId)return Response.json({error:"scopeId is required for conversation/project memory"},{status:400});
 const r=await auth.supabase.from("memories").insert({user_id:auth.userId,scope,scope_id:scopeId,content:body.content.trim(),metadata:body.metadata??null}).select().single();
 if(r.error)return Response.json({error:r.error.message},{status:500});
 try{await indexMemory(auth.supabase,r.data.id,r.data.content)}catch(e){console.error("TRAZ memory indexing failed",e)}
 return Response.json({data:r.data},{status:201});
}