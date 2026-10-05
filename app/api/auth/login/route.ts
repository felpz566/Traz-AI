import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export const runtime="nodejs";

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const email=typeof body?.email==="string"?body.email.trim():"";
    const password=typeof body?.password==="string"?body.password:"";
    const signup=Boolean(body?.signup);
    if(!email||!password) return NextResponse.json({error:"Email and password are required"},{status:400});

    const supabase=await createClient();
    const result=signup
      ? await supabase.auth.signUp({email,password,options:{emailRedirectTo:new URL("/",req.url).origin}})
      : await supabase.auth.signInWithPassword({email,password});

    if(result.error) return NextResponse.json({error:result.error.message},{status:400});
    return NextResponse.json({ok:true,user:result.data.user});
  }catch{
    return NextResponse.json({error:"Authentication failed"},{status:500});
  }
}
