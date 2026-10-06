import {NextResponse} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {exchangeGitHubCode,saveGitHubConnection,verifyGitHubState} from "@/lib/github-oauth";
export const runtime="nodejs";
export async function GET(req:Request){
  const u=new URL(req.url),base=process.env.TRAZ_APP_URL||"http://localhost:3000",code=u.searchParams.get("code"),state=u.searchParams.get("state"),error=u.searchParams.get("error");
  const fail=(m:string)=>NextResponse.redirect(new URL(`/?github_error=${encodeURIComponent(m)}`,base));
  if(error)return fail("GitHub authorization was cancelled.");
  if(!code||!state)return fail("Invalid GitHub authorization response.");
  const auth=await getAuthenticatedUserId();
  if(!auth)return NextResponse.redirect(new URL("/login",base));
  if(!verifyGitHubState(state,auth.userId))return fail("GitHub authorization state validation failed.");
  try{await saveGitHubConnection(auth.userId,await exchangeGitHubCode(code));return NextResponse.redirect(new URL("/?github=connected",base));}
  catch(e){return fail(e instanceof Error?e.message:"GitHub connection failed");}
}