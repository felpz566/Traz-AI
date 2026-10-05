import type {SupabaseClient} from "@supabase/supabase-js";
export async function indexMemory(supabase:SupabaseClient,memoryId:string,content:string){
 const r=await supabase.functions.invoke("traz-memory",{body:{action:"index",memoryId,content}});
 if(r.error)throw new Error(r.error.message); return r.data;
}
export async function searchSemanticMemories(supabase:SupabaseClient,query:string,limit=12){
 const r=await supabase.functions.invoke("traz-memory",{body:{action:"search",query,limit,threshold:0.66}});
 if(r.error)throw new Error(r.error.message);
 return (r.data?.matches||[]) as {memory_id:string;similarity:number}[];
}