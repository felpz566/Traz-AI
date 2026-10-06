import {GoogleGenAI} from "@google/genai";
import {env} from "../env";

export type TrazMessage={role:"user"|"model";text:string};
const client=()=>new GoogleGenAI({apiKey:env.aiToken});

function normalizeHistory(history:TrazMessage[]=[]):TrazMessage[]{
  const result:TrazMessage[]=[];
  for(const message of history){
    const text=typeof message.text==="string"?message.text.trim():"";
    if(!text)continue;
    const role=message.role==="model"?"model":"user";
    const previous=result[result.length-1];
    if(previous?.role===role){
      previous.text += "\n\n" + text;
    }else{
      result.push({role,text});
    }
  }
  while(result[0]?.role==="model") result.shift();
  if(result[result.length-1]?.role==="user") result.pop();
  return result.slice(-20);
}

function contents(prompt:string,history:TrazMessage[]=[]){
  const safePrompt=prompt.trim();
  const safeHistory=normalizeHistory(history);
  return [
    ...safeHistory.map(m=>({role:m.role,parts:[{text:m.text}]})),
    {role:"user" as const,parts:[{text:safePrompt}]}
  ];
}

function config(systemInstruction?:string){
  return systemInstruction?.trim()?{systemInstruction:systemInstruction.trim()}:undefined;
}

export async function generateWithGemini(input:{prompt:string;history?:TrazMessage[];systemInstruction?:string}){
  const response=await client().models.generateContent({
    model:env.aiModel,
    contents:contents(input.prompt,input.history),
    config:config(input.systemInstruction)
  });
  return {text:response.text??"",model:env.aiModel};
}

export async function streamWithGemini(input:{prompt:string;history?:TrazMessage[];systemInstruction?:string}){
  return client().models.generateContentStream({
    model:env.aiModel,
    contents:contents(input.prompt,input.history),
    config:config(input.systemInstruction)
  });
}
