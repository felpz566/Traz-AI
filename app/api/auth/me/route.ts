import {getAuthenticatedUserId} from "@/lib/server/auth";

export async function GET(){
  const auth=await getAuthenticatedUserId();
  if(!auth)return Response.json({authenticated:false},{status:401});
  const user=await auth.supabase.from("app_users").select("id,email,name,avatar_url").eq("id",auth.userId).maybeSingle();
  if(user.error||!user.data)return Response.json({authenticated:false},{status:401});
  return Response.json({authenticated:true,user:user.data});
}
