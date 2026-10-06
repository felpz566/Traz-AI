import {GoogleGenAI} from "@google/genai";
import {env} from "../env";

export type TrazMessage={role:"user"|"model";text:string};
const client=()=>new GoogleGenAI({apiKey:env.aiToken});

const FALLBACK_MODELS=[
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
] as const;

function normalizeHistory(history:TrazMessage[]=[]):TrazMessage[]{
  const result:TrazMessage[]=[];
  for(const message of history){
    const text=typeof message.text==="string"?message.text.trim():"";
    if(!text)continue;
    const role=message.role==="model"?"model":"user";
    const previous=result[result.length-1];
    if(previous?.role===role)previous.text+="\n\n"+text;
    else result.push({role,text});
  }
  while(result[0]?.role==="model")result.shift();
  if(result[result.length-1]?.role==="user")result.pop();
  return result.slice(-20);
}

function contents(prompt:string,history:TrazMessage[]=[]){
  const safePrompt=prompt.trim(),safeHistory=normalizeHistory(history);
  return [...safeHistory.map(m=>({role:m.role,parts:[{text:m.text}]})),{role:"user" as const,parts:[{text:safePrompt}]}];
}

function config(systemInstruction?:string){
  return systemInstruction?.trim()?{systemInstruction:systemInstruction.trim()}:undefined;
}

function errorInfo(error:unknown){
  const e=error as {status?:number;code?:number;message?:string};
  return {
    status:e?.status,
    code:e?.code,
    message:typeof e?.message==="string"?e.message:"",
  };
}

function isServiceUnavailable(error:unknown){
  const e=errorInfo(error);
  return e.status===503||e.code===503||/service unavailable|high demand|temporarily unavailable|overloaded/i.test(e.message);
}

function isDailyQuotaExceeded(error:unknown){
  const e=errorInfo(error);
  return (e.status===429||e.code===429)&&/generate_content_free_tier_requests|GenerateRequestsPerDayPerProjectPerModel|requests.*per.*day|daily quota|RESOURCE_EXHAUSTED/i.test(e.message);
}

function isRetryableRateLimit(error:unknown){
  if(isDailyQuotaExceeded(error))return false;
  const e=errorInfo(error);
  return (e.status===429||e.code===429)&&/rate.?limit|too many requests|resource exhausted/i.test(e.message);
}

function isTransient(error:unknown){
  return isServiceUnavailable(error)||isRetryableRateLimit(error);
}

async function retry<T>(fn:()=>Promise<T>):Promise<T>{
  let last:unknown;
  for(let attempt=0;attempt<3;attempt++){
    try{return await fn();}
    catch(error){
      last=error;
      if(!isTransient(error)||attempt===2)throw error;
      await new Promise(resolve=>setTimeout(resolve,800*(2**attempt)));
    }
  }
  throw last;
}

function fallbackModels(primary:string){
  return [primary,...FALLBACK_MODELS.filter(model=>model!==primary)];
}

async function generateForModel(model:string,input:{prompt:string;history?:TrazMessage[];systemInstruction?:string}){
  return retry(()=>client().models.generateContent({
    model,
    contents:contents(input.prompt,input.history),
    config:config(input.systemInstruction)
  }));
}

export async function generateWithGemini(input:{prompt:string;history?:TrazMessage[];systemInstruction?:string}){
  const models=fallbackModels(env.aiModel);
  let last:unknown;

  for(const model of models){
    try{
      const response=await generateForModel(model,input);
      return {text:response.text??"",model};
    }catch(error){
      last=error;
      if(!isServiceUnavailable(error))throw error;
    }
  }

  throw last;
}

async function* streamForModel(model:string,input:{prompt:string;history?:TrazMessage[];systemInstruction?:string}){
  const stream=await retry(()=>client().models.generateContentStream({
    model,
    contents:contents(input.prompt,input.history),
    config:config(input.systemInstruction)
  }));

  for await(const chunk of stream)yield chunk;
}

export async function* streamWithGemini(input:{prompt:string;history?:TrazMessage[];systemInstruction?:string}){
  const models=fallbackModels(env.aiModel);
  let last:unknown;

  for(const model of models){
    let yielded=false;
    try{
      for await(const chunk of streamForModel(model,input)){
        const text=chunk.text??"";
        if(text)yielded=true;
        yield chunk;
      }
      return;
    }catch(error){
      last=error;
      // Once output was sent to the client, switching models would duplicate text.
      if(yielded||!isServiceUnavailable(error))throw error;
    }
  }

  throw last;
}
