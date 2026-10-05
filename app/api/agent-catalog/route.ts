import {BUILTIN_AGENTS} from "@/lib/agents/catalog";
export async function GET(){return Response.json({data:BUILTIN_AGENTS})}