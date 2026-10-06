import {NextRequest} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {generateWithGemini} from "@/lib/ai/gemini";
import {consumeUsage} from "@/lib/usage/service";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string;fileId:string}>}){
 try{
  const auth=await getAuthenticatedUserId();if(!auth)return Response.json({error:"Unauthorized"},{status:401});
  const{id,fileId}=await params;const body=await req.json().catch(()=>({}));const question=typeof body.question==="string"?body.question.trim():"Summarize and explain this file.";
  const q=await consumeUsage(auth.supabase,auth.userId,"files");if(!q.allowed)return Response.json({error:"File usage limit reached."},{status:429});
  const file=await auth.supabase.from("project_files").select("name,storage_path,mime_type,size_bytes").eq("id",fileId).eq("project_id",id).eq("user_id",auth.userId).maybeSingle();
  if(file.error||!file.data?.storage_path)return Response.json({error:"File not found."},{status:404});
  if((file.data.size_bytes||0)>10*1024*1024)return Response.json({error:"File is too large for direct AI inspection."},{status:413});
  const signed=await auth.supabase.storage.from("traz-files").createSignedUrl(file.data.storage_path,300);if(signed.error)return Response.json({error:signed.error.message},{status:500});
  const bytes=await fetch(signed.data.signedUrl).then(r=>r.arrayBuffer());const mime=file.data.mime_type||"application/octet-stream";
  let result;
  if(mime.startsWith("text/")||/json|javascript|typescript|python|lua|luau|sql|xml|yaml|csv|markdown/.test(mime)||/\.(txt|md|json|ts|tsx|js|jsx|py|lua|luau|sql|yaml|yml|csv)$/i.test(file.data.name)){
   const text=new TextDecoder().decode(bytes);result=await generateWithGemini({prompt:question+"\n\nFILE: "+file.data.name+"\n"+text.slice(0,60000),systemInstruction:"You are TRAZ File Intelligence. Base your answer only on the supplied file. Clearly state when information is unavailable."});
  }else{
   const b64=Buffer.from(bytes).toString("base64");
   const ai=await import("@google/genai");const client=new ai.GoogleGenAI({apiKey:process.env.GEMINI_API_TOKEN!});
   const response=await client.models.generateContent({model:process.env.IA_MODEL||"gemini-3.8-flash",contents:[{role:"user",parts:[{text:question},{inlineData:{mimeType:mime,data:b64}}]}]});
   result={text:response.text||"",model:process.env.IA_MODEL||"gemini-3.8-flash"};
  }
  return Response.json({data:result,file:{name:file.data.name,mimeType:mime}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"File understanding failed"},{status:500})}
}