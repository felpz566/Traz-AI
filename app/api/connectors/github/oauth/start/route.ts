import {NextResponse} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {createGitHubState,getGitHubAuthorizeUrl} from "@/lib/github-oauth";
export const runtime="nodejs";
export async function GET(){
  const auth=await getAuthenticatedUserId();
  const base=process.env.TRAZ_APP_URL||"http://localhost:3000";
  if(!auth)return NextResponse.redirect(new URL("/login",base));
  try{
    const state=createGitHubState(auth.userId);
    return NextResponse.redirect(getGitHubAuthorizeUrl(state));
  }catch(e){
    const message=e instanceof Error?e.message:"GitHub OAuth is not configured";
    console.error("TRAZ GitHub OAuth start failed",e);
    return NextResponse.redirect(new URL(`/?github_error=${encodeURIComponent(message)}`,base));
  }
}