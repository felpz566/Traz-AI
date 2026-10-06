import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {getGitHubUser,listGitHubRepos} from "@/lib/github";
export const runtime="nodejs";
export async function GET(){
 const auth=await getAuthenticatedUserId();if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});
 try{const user=await getGitHubUser();return NextResponse.json({connected:true,user:{login:user.login,name:user.name,avatarUrl:user.avatar_url}})}
 catch(error){return NextResponse.json({connected:false,error:error instanceof Error?error.message:"GitHub is not configured"},{status:503})}
}
export async function POST(req:NextRequest){
 const auth=await getAuthenticatedUserId();if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});
 try{const user=await getGitHubUser();const repos=await listGitHubRepos();return NextResponse.json({connected:true,user:{login:user.login,name:user.name,avatarUrl:user.avatar_url},repositories:repos})}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"GitHub connection failed"},{status:503})}
}
