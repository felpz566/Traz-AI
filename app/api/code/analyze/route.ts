import {NextRequest} from "next/server";
import {generateWithGemini} from "@/lib/ai/gemini";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {consumeUsage} from "@/lib/usage/service";
import {recordAIEvent} from "@/lib/observability";
export async function POST(req:NextRequest){
 const started=Date.now();
 try{
  const auth=await getAuthenticatedUserId(); if(!auth)return Response.json({error:"Unauthorized"},{status:401});
  const body=await req.json(); const code=typeof body.code==="string"?body.code:""; if(!code.trim())return Response.json({error:"code is required"},{status:400});
  const q=await consumeUsage(auth.supabase,auth.userId,"messages"); if(!q.allowed)return Response.json({error:"Usage limit reached."},{status:429});
  const result=await generateWithGemini({prompt:`Analyze this code. Identify bugs, security issues, performance issues and concrete improvements. Do not execute it. Return a concise structured review.\n\nLanguage: ${typeof body.language==="string"?body.language:"unknown"}\n${code.slice(0,30000)}`,systemInstruction:"You are TRAZ Code Studio. Never claim code was executed or tested when it was not."});
  void recordAIEvent(auth.supabase,{userId:auth.userId,kind:"code",route:"/api/code/analyze",model:result.model,durationMs:Date.now()-started,success:true});
  return Response.json({data:result});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Code analysis failed"},{status:500})}
}