import {NextRequest,NextResponse} from "next/server";
import {randomBytes} from "node:crypto";

export const runtime="nodejs";

const GOOGLE_CLIENT_ID="795721655973-brcq3u5fb89asrgqcbrqg0fj6qiumt6h.apps.googleusercontent.com";

export async function GET(req:NextRequest){
  const state=randomBytes(32).toString("hex");
  const redirectUri=new URL("/api/auth/callback/google",req.url).toString();
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri",redirectUri);
  url.searchParams.set("response_type","code");
  url.searchParams.set("scope","openid email profile");
  url.searchParams.set("state",state);
  url.searchParams.set("access_type","online");
  const response=NextResponse.redirect(url);
  response.cookies.set("traz_oauth_state",state,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
  return response;
}

export async function POST(){
  return NextResponse.json({error:"Password login is disabled. Use Google."},{status:405});
}
