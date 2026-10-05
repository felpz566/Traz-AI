import {NextRequest} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {generateImage} from "@/lib/ai/image";
import {consumeUsage} from "@/lib/usage/service";
import {recordAIEvent} from "@/lib/observability";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const started=Date.now();
 try{
  const auth=await getAuthenticatedUserId(); if(!auth)return Response.json({error:"Unauthorized"},{status:401});
  const body=await req.json(); const prompt=typeof body.prompt==="string"?body.prompt.trim():"";
  if(!prompt)return Response.json({error:"prompt is required"},{status:400});
  const q=await consumeUsage(auth.supabase,auth.userId,"messages"); if(!q.allowed)return Response.json({error:"Usage limit reached."},{status:429});
  const result=await generateImage({prompt,aspectRatio:typeof body.aspectRatio==="string"?body.aspectRatio:undefined,imageSize:body.imageSize});
  void recordAIEvent(auth.supabase,{userId:auth.userId,kind:"image",route:"/api/image/generate",model:"gemini-3.1-flash-image",durationMs:Date.now()-started,success:true});
  return Response.json({data:result});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Image generation failed"},{status:500})}
}