import {randomBytes,createHash} from "node:crypto";
import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {SESSION_COOKIE} from "@/lib/server/auth";

export const runtime="nodejs";
const GOOGLE_CLIENT_ID="795721655973-brcq3u5fb89asrgqcbrqg0fj6qiumt6h.apps.googleusercontent.com";

export async function GET(req:NextRequest){
  const url=new URL(req.url);
  const code=url.searchParams.get("code"),state=url.searchParams.get("state");
  const cookieStore=await cookies(),savedState=cookieStore.get("traz_oauth_state")?.value;
  if(!code||!state||!savedState||state!==savedState)return NextResponse.redirect(new URL("/login?error=oauth_state",req.url));
  const clientSecret=process.env.GOOGLE_OAUTH;
  if(!clientSecret)return NextResponse.json({error:"GOOGLE_OAUTH is not configured"},{status:500});
  const redirectUri=new URL("/api/auth/callback/google",req.url).toString();
  const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:GOOGLE_CLIENT_ID,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"}),cache:"no-store"});
  if(!tokenResponse.ok)return NextResponse.redirect(new URL("/login?error=oauth_token",req.url));
  const tokens=await tokenResponse.json() as {access_token?:string};
  if(!tokens.access_token)return NextResponse.redirect(new URL("/login?error=oauth_token",req.url));
  const profileResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:`Bearer ${tokens.access_token}`},cache:"no-store"});
  if(!profileResponse.ok)return NextResponse.redirect(new URL("/login?error=oauth_profile",req.url));
  const profile=await profileResponse.json() as {sub?:string;email?:string;name?:string;picture?:string};
  if(!profile.sub||!profile.email)return NextResponse.redirect(new URL("/login?error=oauth_profile",req.url));
  const supabase=createAdminClient();
  let found=await supabase.from("app_users").select("id").eq("google_sub",profile.sub).maybeSingle();
  if(!found.data)found=await supabase.from("app_users").select("id").eq("email",profile.email.toLowerCase()).maybeSingle();
  let userId=found.data?.id as string|undefined;
  if(userId){const updated=await supabase.from("app_users").update({google_sub:profile.sub,name:profile.name??null,avatar_url:profile.picture??null,updated_at:new Date().toISOString()}).eq("id",userId);if(updated.error)return NextResponse.json({error:"Could not update account"},{status:500});}
  else{const created=await supabase.from("app_users").insert({email:profile.email.toLowerCase(),name:profile.name??null,avatar_url:profile.picture??null,google_sub:profile.sub}).select("id").single();if(created.error||!created.data)return NextResponse.json({error:"Could not create account"},{status:500});userId=created.data.id;}
  const existingProfile=await supabase.from("profiles").select("id").eq("id",userId).maybeSingle();
  if(!existingProfile.data){const createdProfile=await supabase.from("profiles").insert({id:userId,plan:"free"});if(createdProfile.error)return NextResponse.json({error:"Could not initialize account"},{status:500});}
  const rawToken=randomBytes(48).toString("base64url"),tokenHash=createHash("sha256").update(rawToken).digest("hex"),expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
  const session=await supabase.from("app_sessions").insert({user_id:userId,token_hash:tokenHash,expires_at:expiresAt});
  if(session.error)return NextResponse.json({error:"Could not create session"},{status:500});
  const response=NextResponse.redirect(new URL("/",req.url));
  response.cookies.set("traz_oauth_state","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  response.cookies.set(SESSION_COOKIE,rawToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:30*24*60*60});
  return response;
}