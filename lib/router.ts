import {TRAZ_MODELS,type Plan} from "@/lib/models";
export type ReasoningMode="auto"|"fast"|"think"|"think-more"|"deep-think";
const rank:Record<Plan,number>={free:0,pro:1,r:2,ultra:3};
function allowed(id:string,plan:Plan){const m=TRAZ_MODELS.find(x=>x.id===id);return !!m&&rank[m.plan]<=rank[plan]}
function fallback(preferred:string,plan:Plan){if(allowed(preferred,plan))return preferred;const order=plan==="ultra"?["traz-1-3-ultra","traz-ultra-reason","traz-1-pro-reason","traz-1-reason","traz-1-fast"]:plan==="r"?["traz-r1","traz-1-pro-reason","traz-1-reason","traz-1-fast"]:plan==="pro"?["traz-1-pro-reason","traz-1-reason","traz-1-fast"]:["traz-1-reason","traz-1-standard","traz-1-fast"];return order.find(id=>allowed(id,plan))||"traz-1-fast"}
export function routeTask(input:{prompt:string;mode?:ReasoningMode;hasFiles?:boolean;hasImage?:boolean;plan?:Plan}){
 const t=input.prompt.toLowerCase(),plan=input.plan??"free";
 const code=/\b(code|código|luau|lua|typescript|javascript|python|bug|debug|refactor|api)\b/.test(t);
 const complex=t.length>1400||/\b(architecture|arquitetura|prove|prova|analyze|analise|research|pesquise|compare)\b/.test(t);
 let preferred="traz-1-fast",reasoning=input.mode??"auto";
 if(input.mode==="fast")preferred="traz-1-fast";
 else if(input.mode==="deep-think"){preferred=plan==="ultra"?"traz-1-3-ultra":plan==="r"?"traz-r1":plan==="pro"?"traz-1-pro-reason":"traz-1-reason";reasoning="deep"}
 else if(code)preferred=plan==="ultra"?"traz-ultra-code":plan==="r"?"traz-r1-code":plan==="pro"?"traz-1-pro-code":"traz-1-standard";
 else if(input.hasImage)preferred=plan==="ultra"?"traz-ultra-vision":plan==="pro"?"traz-1-pro-vision":"traz-1-vision";
 else if(complex||input.hasFiles)preferred=plan==="ultra"?"traz-1-3-ultra":plan==="r"?"traz-r1":"traz-1-standard";
 return{model:fallback(preferred,plan),reasoning};
}