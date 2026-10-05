import {TRAZ_MODELS} from "@/lib/models";

export async function GET(){
  return Response.json({
    object:"list",
    data:TRAZ_MODELS.map(model=>({
      id:model.id,
      object:"model",
      capabilities:model.capabilities,
      tier:model.plan,
    })),
  });
}
