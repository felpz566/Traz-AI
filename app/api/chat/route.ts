import { NextRequest } from "next/server";
import { generateWithGemini, streamWithGemini, type TrazMessage } from "@/lib/ai/gemini";
import { routeTask, type ReasoningMode } from "@/lib/router";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { formatMemoryContext, getRelevantMemories } from "@/lib/memory/service";
import { extractMemories } from "@/lib/memory/extract";
import { searchSemanticMemories, indexMemory } from "@/lib/memory/semantic";
import { consumeUsage } from "@/lib/usage/service";
import { TRAZ_MODELS } from "@/lib/models";
import { recordAIEvent } from "@/lib/observability";

export const runtime = "nodejs";
type Body={prompt?:string;history?:TrazMessage[];mode?:ReasoningMode;stream?:boolean;hasFiles?:boolean;hasImage?:boolean;conversationId?:string;projectId?:string;model?:string};

async function saveMemories(supabase:NonNullable<Awaited<ReturnType<typeof getAuthenticatedUserId>>>["supabase"],userId:string,content:string,conversationId?:string,projectId?:string){
 const extracted=await extractMemories(content); if(!extracted.length)return;
 for(const memory of extracted){
  const saved=await supabase.from("memories").insert({user_id:userId,scope:projectId?"project":"user",scope_id:projectId||null,content:memory,metadata:{source:"chat",conversationId:conversationId||null}}).select("id").single();
  if(saved.data)try{await indexMemory(supabase,saved.data.id,memory)}catch(e){console.error("TRAZ memory indexing failed",e)}
 }
}

export async function POST(request:NextRequest){
 const started=Date.now();
 try{
  const body=await request.json() as Body; const prompt=body.prompt?.trim();
  if(!prompt)return Response.json({error:"Prompt is required."},{status:400});
  const auth=await getAuthenticatedUserId();
  let plan:"free"|"pro"|"r"|"ultra"="free";
  if(auth){const quota=await consumeUsage(auth.supabase,auth.userId,"messages");if(!quota.allowed)return Response.json({error:"Message usage limit reached.",plan:quota.plan,limit:quota.limit,used:quota.used},{status:429});plan=quota.plan;}
  const route=routeTask({prompt,mode:body.mode,hasFiles:body.hasFiles,hasImage:body.hasImage,plan});
  const requestedModel=body.model?.trim();
  const selectedModel=requestedModel ? TRAZ_MODELS.find((model)=>model.id===requestedModel) : null;
  const ranks={free:0,pro:1,r:2,ultra:3} as const;
  if(requestedModel && (!selectedModel || ranks[selectedModel.plan]>ranks[plan])) return Response.json({error:"Model is not available for your plan."},{status:403});
  if(selectedModel) route.model=selectedModel.id;
  let conversationId=body.conversationId;
  if(auth&&conversationId){const owned=await auth.supabase.from("conversations").select("id").eq("id",conversationId).eq("user_id",auth.userId).maybeSingle();if(owned.error)throw new Error(`Could not load conversation: ${owned.error.message}`);if(!owned.data)conversationId=undefined;}
  if(auth&&!conversationId){const created=await auth.supabase.from("conversations").insert({user_id:auth.userId,title:prompt.slice(0,80)}).select("id").single();if(created.error||!created.data)throw new Error(`Could not create conversation: ${created.error?.message||"unknown database error"}`);conversationId=created.data.id;}
  let memoryContext="";
  if(auth){
    const base=await getRelevantMemories(auth.supabase,auth.userId,{conversationId,projectId:body.projectId,limit:8});
    let semantic:{memory_id:string;similarity:number}[]=[];
    try{semantic=await searchSemanticMemories(auth.supabase,prompt,8)}catch(e){console.error("TRAZ semantic memory search failed",e)}
    const ids=semantic.map(item=>item.memory_id).filter(id=>!base.some(memory=>memory.id===id));
    const extra=ids.length?await auth.supabase.from("memories").select("id,scope,scope_id,content,metadata").in("id",ids).eq("user_id",auth.userId):{data:[]};
    memoryContext=formatMemoryContext([...base,...((extra.data||[]) as typeof base)]);
  }
  if(auth&&conversationId){const savedUser=await auth.supabase.from("messages").insert({conversation_id:conversationId,user_id:auth.userId,role:"user",content:prompt});if(savedUser.error)throw new Error(`Could not save user message: ${savedUser.error.message}`);const touched=await auth.supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId).eq("user_id",auth.userId);if(touched.error)console.error("TRAZ conversation timestamp update failed",touched.error);}
  const systemInstruction=["You are TRAZ AI, a premium general-purpose AI assistant.","Be accurate, useful and explicit about uncertainty.","Never reveal private chain-of-thought; provide concise reasoning summaries instead.",`TRAZ route: ${route.model}; reasoning: ${route.reasoning}.`,memoryContext].filter(Boolean).join("\n");
  if(body.stream!==false){
   const stream=await streamWithGemini({prompt,history:body.history,systemInstruction});const encoder=new TextEncoder();let fullText="";
   const readable=new ReadableStream({async start(controller){try{for await(const chunk of stream){const text=chunk.text??"";if(text){fullText+=text;controller.enqueue(encoder.encode(text));}}
    if(auth&&conversationId&&fullText){const savedAssistant=await auth.supabase.from("messages").insert({conversation_id:conversationId,user_id:auth.userId,role:"assistant",content:fullText,model:route.model});if(savedAssistant.error)console.error("TRAZ assistant message save failed",savedAssistant.error);const touched=await auth.supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId).eq("user_id",auth.userId);if(touched.error)console.error("TRAZ conversation timestamp update failed",touched.error);try{await saveMemories(auth.supabase,auth.userId,prompt,conversationId,body.projectId)}catch(e){console.error("TRAZ memory extraction failed",e)}}
    if(auth) void recordAIEvent(auth.supabase,{userId:auth.userId,kind:"chat",route:"/api/chat",model:route.model,durationMs:Date.now()-started,success:true,metadata:{stream:true,reasoning:route.reasoning}});
    controller.close();}catch(error){controller.error(error)}}});
   return new Response(readable,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Avenix-Model":route.model,"X-Avenix-Reasoning":route.reasoning,...(conversationId?{"X-Avenix-Conversation-Id":conversationId}:{})}});
  }
  const result=await generateWithGemini({prompt,history:body.history,systemInstruction});
  if(auth&&conversationId&&result.text){const savedAssistant=await auth.supabase.from("messages").insert({conversation_id:conversationId,user_id:auth.userId,role:"assistant",content:result.text,model:route.model});if(savedAssistant.error)throw new Error(`Could not save assistant message: ${savedAssistant.error.message}`);const touched=await auth.supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId).eq("user_id",auth.userId);if(touched.error)console.error("TRAZ conversation timestamp update failed",touched.error);try{await saveMemories(auth.supabase,auth.userId,prompt,conversationId,body.projectId)}catch(e){console.error("TRAZ memory extraction failed",e)}}
  if(auth) void recordAIEvent(auth.supabase,{userId:auth.userId,kind:"chat",route:"/api/chat",model:route.model,durationMs:Date.now()-started,success:true,metadata:{stream:false,reasoning:route.reasoning}});
  return Response.json({...result,route,conversationId});
 }catch(error){console.error("TRAZ chat error",error);return Response.json({error:error instanceof Error?error.message:"TRAZ could not complete the request."},{status:500})}
}
