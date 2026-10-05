import {NextRequest} from "next/server";
import {generateWithGemini} from "@/lib/ai/gemini";
import {routeTask,type ReasoningMode} from "@/lib/router";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {getApiUserId} from "@/lib/server/api-auth";
import {consumeUsage,getPlan} from "@/lib/usage/service";
import {TRAZ_MODELS} from "@/lib/models";
export const runtime="nodejs";
const MODES=new Set<ReasoningMode>(["auto","fast","think","think-more","deep-think"]);
export async function POST(request:NextRequest){
 try{
  const body=await request.json() as Record<string,unknown>;const input=typeof body.input==="string"?body.input.trim():"";if(!input)return Response.json({error:"input is required"},{status:400});
  const session=await getAuthenticatedUserId();const api=await getApiUserId(request);const auth=session?{userId:session.userId,supabase:session.supabase}:api?{userId:api.userId,supabase:api.admin}:null;if(!auth)return Response.json({error:"Unauthorized"},{status:401});
  const q=await consumeUsage(auth.supabase,auth.userId,"messages");if(!q.allowed)return Response.json({error:"Message usage limit reached.",plan:q.plan,limit:q.limit,used:q.used},{status:429});
  const plan=await getPlan(auth.supabase,auth.userId);const reasoning=typeof body.reasoning==="string"&&MODES.has(body.reasoning as ReasoningMode)?body.reasoning as ReasoningMode:undefined;const routed=routeTask({prompt:input,mode:reasoning,plan});
  const requested=typeof body.model==="string"?body.model:routed.model;const selected=TRAZ_MODELS.find(m=>m.id===requested);if(!selected)return Response.json({error:"Unknown model."},{status:400});
  const order=["free","pro","r","ultra"];if(order.indexOf(selected.plan)>order.indexOf(plan))return Response.json({error:"Model is not available for your plan."},{status:403});
  const output=await generateWithGemini({prompt:input,systemInstruction:"You are TRAZ AI. Be accurate and useful. Never reveal private chain-of-thought; provide concise reasoning summaries instead."});
  return Response.json({id:crypto.randomUUID(),object:"response",model:selected.id,output:output.text});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Request failed"},{status:400})}
}