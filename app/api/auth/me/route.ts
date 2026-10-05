import {createClient} from "@/lib/supabase/server";

export async function GET(){
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user) return Response.json({authenticated:false},{status:401});
  return Response.json({authenticated:true,user:{id:data.user.id,email:data.user.email}});
}
