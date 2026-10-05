import type {SupabaseClient} from "@supabase/supabase-js";
export async function recordAIEvent(supabase:SupabaseClient,input:{userId?:string|null;kind:string;route?:string;model?:string;durationMs?:number;success?:boolean;metadata?:Record<string,unknown>}){
 const r=await supabase.from("ai_observability_events").insert({user_id:input.userId??null,kind:input.kind,route:input.route??null,model:input.model??null,duration_ms:input.durationMs??null,success:input.success??true,metadata:input.metadata??null});
 if(r.error)console.error("TRAZ observability error",r.error.message);
}