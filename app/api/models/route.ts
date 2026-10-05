import {TRAZ_MODELS} from "@/lib/models";
export async function GET(){return Response.json({models:TRAZ_MODELS});}