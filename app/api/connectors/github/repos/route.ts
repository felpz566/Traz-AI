import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {getGitHubAccessToken} from "@/lib/github-oauth";
import {getGitHubContents,getGitHubRepo,getGitHubTree} from "@/lib/github";
export const runtime="nodejs";
export async function GET(req:NextRequest){const auth=await getAuthenticatedUserId();if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});const u=new URL(req.url),owner=u.searchParams.get("owner"),repo=u.searchParams.get("repo"),path=u.searchParams.get("path")||"",ref=u.searchParams.get("ref")||"";if(!owner||!repo)return NextResponse.json({error:"owner and repo are required"},{status:400});try{const token=await getGitHubAccessToken(auth.userId),repository=await getGitHubRepo(owner,repo,token);if(path){const content=await getGitHubContents(owner,repo,path,ref||repository.default_branch,token);return NextResponse.json({repository,content});}const tree=await getGitHubTree(owner,repo,ref||repository.default_branch,token);return NextResponse.json({repository,tree});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"GitHub request failed"},{status:502})}}
