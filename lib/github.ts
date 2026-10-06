const API="https://api.github.com";

async function github(path:string,token:string,init:RequestInit={}) {
  const response=await fetch(API+path,{...init,headers:{"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Authorization":`Bearer ${token}`,...(init.headers||{})},cache:"no-store"});
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(data?.message||`GitHub request failed (${response.status})`);
  return data;
}
export type GitHubUser={id:number;login:string;name:string|null;avatar_url:string};
export type GitHubRepo={id:number;full_name:string;name:string;private:boolean;default_branch:string;html_url:string;description:string|null};
export async function getGitHubUser(token:string){return github("/user",token) as Promise<GitHubUser>;}
export async function listGitHubRepos(token:string){return github("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",token) as Promise<GitHubRepo[]>;}
export async function getGitHubRepo(owner:string,repo:string,token:string){return github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,token) as Promise<GitHubRepo>;}
export async function getGitHubContents(owner:string,repo:string,path="",ref?:string,token?:string){
  if(!token) throw new Error("GitHub access token is required");
  const q=ref?`?ref=${encodeURIComponent(ref)}`:"";
  return github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}${q}`,token);
}
export async function getGitHubTree(owner:string,repo:string,ref="HEAD",token?:string){
  if(!token) throw new Error("GitHub access token is required");
  const branch=await getGitHubRepo(owner,repo,token);
  const selected=ref==="HEAD"?branch.default_branch:ref;
  return github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(selected)}?recursive=1`,token);
}
