import {NextRequest} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {runAgent} from "@/lib/agents/runtime";
import {consumeUsage} from "@/lib/usage/service";
import {recordAIEvent} from "@/lib/observability";

export const runtime="nodejs";

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const started=Date.now();
  const auth=await getAuthenticatedUserId(); if(!auth)return Response.json({error:"Unauthorized"},{status:401});
  const {id}=await params; const body=await req.json().catch(()=>({}));
  const prompt=typeof body.prompt==="string"?body.prompt.trim():""; if(!prompt)return Response.json({error:"prompt is required"},{status:400});
  const agent=await auth.supabase.from("agents").select("*").eq("id",id).eq("user_id",auth.userId).maybeSingle();
  if(agent.error)return Response.json({error:agent.error.message},{status:500}); if(!agent.data)return Response.json({error:"Agent not found"},{status:404});
  const quota=await consumeUsage(auth.supabase,auth.userId,"agents");
  if(quota.plan==="free")return Response.json({error:"Agents require a paid TRAZ plan."},{status:403});
  if(!quota.allowed)return Response.json({error:"Agent usage limit reached.",plan:quota.plan,limit:quota.limit,used:quota.used},{status:429});
  const result=await runAgent({supabase:auth.supabase,userId:auth.userId,agent:agent.data,prompt,conversationId:typeof body.conversationId==="string"?body.conversationId:undefined,projectId:typeof body.projectId==="string"?body.projectId:undefined,maxSteps:typeof body.maxSteps==="number"?body.maxSteps:6});
  void recordAIEvent(auth.supabase,{userId:auth.userId,kind:"agent",route:"/api/agents/[id]/run",model:result.model,durationMs:Date.now()-started,success:true,metadata:{agentId:id,steps:result.steps,toolCalls:result.toolCalls}});
  return Response.json({data:result});
 }catch(error){console.error("TRAZ agent error",error);return Response.json({error:error instanceof Error?error.message:"Agent failed"},{status:500})}
}