import {generateWithGemini} from "@/lib/ai/gemini";
import {executeAgentTool,AGENT_TOOLS} from "./tools";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {AgentRunResult} from "./types";

const NAMES=Object.keys(AGENT_TOOLS).join(", ");
const system=(instructions:string,model:string)=>`You are an executable TRAZ agent.
Instructions: ${instructions||"Be helpful, accurate and concise."}
Never reveal private chain-of-thought. Return concise reasoning summaries.
Tools: ${NAMES}.
Return ONLY JSON:
{"type":"final","text":"..."}
or {"type":"tool","name":"memory_search","args":{}}
or {"type":"tool","name":"memory_save","args":{"content":"..."}}
or {"type":"tool","name":"project_files_list","args":{}}
or {"type":"tool","name":"project_file_open","args":{"fileId":"..."}}
Never invent tool results. Product model: ${model}`;

export async function runAgent(input:{supabase:SupabaseClient;userId:string;agent:{instructions:string;model:string;permissions:unknown};prompt:string;conversationId?:string;projectId?:string;maxSteps?:number}):Promise<AgentRunResult>{
 const maxSteps=Math.min(Math.max(input.maxSteps??6,1),12); let task=input.prompt; let calls=0;
 for(let step=1;step<=maxSteps;step++){
  const out=await generateWithGemini({prompt:task,systemInstruction:system(input.agent.instructions,input.agent.model)});
  let action:{type:string;text?:string;name?:string;args?:Record<string,unknown>};
  try{action=JSON.parse(out.text)}catch{return{text:out.text,steps:step,toolCalls:calls,model:input.agent.model}};
  if(action.type==="final"&&typeof action.text==="string")return{text:action.text,steps:step,toolCalls:calls,model:input.agent.model};
  if(action.type!=="tool"||typeof action.name!=="string"||!(action.name in AGENT_TOOLS))return{text:"I couldn't safely execute that agent step.",steps:step,toolCalls:calls,model:input.agent.model};
  const permissions=input.agent.permissions&&typeof input.agent.permissions==="object"?input.agent.permissions as Record<string,unknown>:{};
  if(permissions[action.name]===false)return{text:`Tool ${action.name} is disabled for this agent.`,steps:step,toolCalls:calls,model:input.agent.model};
  try{
   const result=await executeAgentTool(action.name as keyof typeof AGENT_TOOLS,action.args??{},{supabase:input.supabase,userId:input.userId,projectId:input.projectId,conversationId:input.conversationId});
   calls++; task=`Original task:
${input.prompt}
Tool executed: ${action.name}
Trusted result:
${JSON.stringify(result).slice(0,12000)}
Return ONLY the next JSON action.`;
  }catch(error){return{text:`Tool ${action.name} failed: ${error instanceof Error?error.message:"unknown error"}`,steps:step,toolCalls:calls,model:input.agent.model}}
 }
 return{text:"The agent reached its execution limit before producing a final answer.",steps:maxSteps,toolCalls:calls,model:input.agent.model};
}