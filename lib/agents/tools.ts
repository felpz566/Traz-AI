import type {SupabaseClient} from "@supabase/supabase-js";
import {getRelevantMemories} from "@/lib/memory/service";
import type {AgentToolName} from "./types";

type Context={supabase:SupabaseClient;userId:string;projectId?:string;conversationId?:string};
export const AGENT_TOOLS:Record<AgentToolName,{description:string}>={
 memory_search:{description:"Search persistent memories relevant to the current task."},
 memory_save:{description:"Save a durable non-sensitive user fact or preference."},
 project_files_list:{description:"List files in the selected project."},
 project_file_open:{description:"Get a short-lived signed URL for a project file."},
};
export async function executeAgentTool(name:AgentToolName,args:Record<string,unknown>,ctx:Context){
 if(name==="memory_search")return{memories:await getRelevantMemories(ctx.supabase,ctx.userId,{conversationId:ctx.conversationId,projectId:ctx.projectId,limit:12})};
 if(name==="memory_save"){
  const content=typeof args.content==="string"?args.content.trim():"";
  if(!content||content.length>500)throw new Error("Invalid memory content.");
  const r=await ctx.supabase.from("memories").insert({user_id:ctx.userId,scope:ctx.projectId?"project":"user",scope_id:ctx.projectId||null,content,metadata:{source:"agent"}});
  if(r.error)throw new Error(r.error.message); return{saved:true};
 }
 if(name==="project_files_list"){
  if(!ctx.projectId)return{files:[]};
  const r=await ctx.supabase.from("project_files").select("id,name,path,mime_type,size_bytes,created_at").eq("project_id",ctx.projectId).eq("user_id",ctx.userId).order("created_at",{ascending:false}).limit(100);
  if(r.error)throw new Error(r.error.message); return{files:r.data??[]};
 }
 if(name==="project_file_open"){
  const id=typeof args.fileId==="string"?args.fileId:"";
  if(!ctx.projectId||!id)throw new Error("projectId and fileId are required.");
  const f=await ctx.supabase.from("project_files").select("id,name,path,storage_path,mime_type,size_bytes").eq("id",id).eq("project_id",ctx.projectId).eq("user_id",ctx.userId).maybeSingle();
  if(f.error||!f.data?.storage_path)throw new Error(f.error?.message||"File not found.");
  const s=await ctx.supabase.storage.from("traz-files").createSignedUrl(f.data.storage_path,300);
  if(s.error)throw new Error(s.error.message); return{file:{...f.data,url:s.data.signedUrl}};
 }
 throw new Error("Unsupported agent tool.");
}