import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {getGitHubAccessToken,getGitHubConnection} from "@/lib/github-oauth";
import {listGitHubRepos} from "@/lib/github";
export const runtime="nodejs";
export async function GET(){const auth=await getAuthenticatedUserId();if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});try{const c=await getGitHubConnection(auth.userId);if(!c)return NextResponse.json({connected:false});return NextResponse.json({connected:true,user:{login:c.github_login,name:c.github_name,avatarUrl:c.github_avatar_url}})}catch(e){return NextResponse.json({connected:false,error:e instanceof Error?e.message:"GitHub connection failed"},{status:500})}}
export async function POST(req:NextRequest){const auth=await getAuthenticatedUserId();if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});try{const token=await getGitHubAccessToken(auth.userId),c=await getGitHubConnection(auth.userId),repos=await listGitHubRepos(token);return NextResponse.json({connected:true,user:{login:c?.github_login,name:c?.github_name,avatarUrl:c?.github_avatar_url},repositories:repos})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"GitHub is not connected"},{status:400})}}
