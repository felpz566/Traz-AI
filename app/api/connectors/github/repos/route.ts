import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedUserId} from "@/lib/server/auth";
import {getGitHubContents,getGitHubRepo,getGitHubTree} from "@/lib/github";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const auth=await getAuthenticatedUserId();if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});
 const url=new URL(req.url),owner=url.searchParams.get("owner"),repo=url.searchParams.get("repo"),path=url.searchParams.get("path")||"",ref=url.searchParams.get("ref")||"";
 if(!owner||!repo)return NextResponse.json({error:"owner and repo are required"},{status:400});
 try{
  const repository=await getGitHubRepo(owner,repo);
  if(path){const content=await getGitHubContents(owner,repo,path,ref||repository.default_branch);return NextResponse.json({repository,content});}
  const tree=await getGitHubTree(owner,repo,ref||repository.default_branch);return NextResponse.json({repository,tree});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"GitHub request failed"},{status:502})}
}
