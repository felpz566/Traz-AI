import {NextRequest} from "next/server";
import {generateWithGemini} from "@/lib/ai/gemini";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {consumeUsage} from "@/lib/usage/service";
import {recordAIEvent} from "@/lib/observability";
export async function POST(req:NextRequest){
 const started=Date.now();
 try{
  const auth=await getAuthenticatedUserId(); if(!auth)return Response.json({error:"Unauthorized"},{status:401});
  const body=await req.json(); const prompt=typeof body.prompt==="string"?body.prompt.trim():""; if(!prompt)return Response.json({error:"prompt is required"},{status:400});
  const q=await consumeUsage(auth.supabase,auth.userId,"messages"); if(!q.allowed)return Response.json({error:"Usage limit reached."},{status:429});
  const result=await generateWithGemini({prompt,systemInstruction:"You are the TRAZ Lab. Explore model behavior, prompts, reasoning modes and tool strategies. Never expose private chain-of-thought."});
  void recordAIEvent(auth.supabase,{userId:auth.userId,kind:"lab",route:"/api/lab/run",model:result.model,durationMs:Date.now()-started,success:true});
  return Response.json({data:result});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Lab request failed"},{status:500})}
}