export type Plan="free"|"pro"|"r"|"ultra";
export type ModelCapability="reasoning"|"coding"|"vision"|"audio"|"image"|"long-context"|"tools"|"agentic"|"speed";

export type TrazModel={id:string;plan:Plan;capabilities:ModelCapability[]};

const capabilities=(...items:ModelCapability[])=>items;

export const TRAZ_MODELS:TrazModel[]=[
{id:"traz-1-mini",plan:"free",capabilities:capabilities("speed")},
{id:"traz-1-fast",plan:"free",capabilities:capabilities("speed")},
{id:"traz-1-standard",plan:"free",capabilities:capabilities("reasoning","coding")},
{id:"traz-1-reason",plan:"free",capabilities:capabilities("reasoning")},
{id:"traz-1-vision",plan:"free",capabilities:capabilities("vision")},
{id:"traz-0-1-pro",plan:"pro",capabilities:capabilities("reasoning","coding","speed")},
{id:"traz-1-pro-reason",plan:"pro",capabilities:capabilities("reasoning")},
{id:"traz-1-pro-code",plan:"pro",capabilities:capabilities("coding","reasoning")},
{id:"traz-1-pro-vision",plan:"pro",capabilities:capabilities("vision")},
{id:"traz-1-pro-create",plan:"pro",capabilities:capabilities("image","vision")},
{id:"traz-1-pro-fast",plan:"pro",capabilities:capabilities("speed","tools")},
{id:"traz-r1",plan:"r",capabilities:capabilities("reasoning")},
{id:"traz-r1-pro",plan:"r",capabilities:capabilities("reasoning","coding")},
{id:"traz-r1-code",plan:"r",capabilities:capabilities("reasoning","coding")},
{id:"traz-r1-research",plan:"r",capabilities:capabilities("reasoning","tools")},
{id:"traz-r1-agent",plan:"r",capabilities:capabilities("reasoning","agentic","tools")},
{id:"traz-1-3-ultra",plan:"ultra",capabilities:capabilities("reasoning","coding","long-context")},
{id:"traz-ultra-code",plan:"ultra",capabilities:capabilities("coding","reasoning")},
{id:"traz-ultra-reason",plan:"ultra",capabilities:capabilities("reasoning","long-context")},
{id:"traz-ultra-vision",plan:"ultra",capabilities:capabilities("vision","long-context")},
{id:"traz-ultra-research",plan:"ultra",capabilities:capabilities("reasoning","tools","long-context")},
{id:"traz-ultra-agent",plan:"ultra",capabilities:capabilities("agentic","tools","reasoning")}
];