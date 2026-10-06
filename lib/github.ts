const API="https://api.github.com";
function token(){const value=process.env.GITHUB_TOKEN;if(!value)throw new Error("GITHUB_TOKEN is not configured");return value;}
async function github(path:string,init:RequestInit={}){const response=await fetch(API+path,{...init,headers:{"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Authorization":`Bearer ${token()}",...(init.headers||{})},cache:"no-store"});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.message||`GitHub request failed (${response.status})`);return data;}
export type GitHubRepo={id:number;full_name:string;name:string;private:boolean;default_branch:string;html_url:string;description:string|null};
export async function getGitHubUser(){return github("/user") as Promise<{login:string;name:string|null;avatar_url:string}>;}
export async function listGitHubRepos(){return github("/user/repos?per_page=100&sort=updated") as Promise<GitHubRepo[]>;}
export async function getGitHubRepo(owner:string,repo:string){return github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`) as Promise<GitHubRepo>;}
export async function getGitHubContents(owner:string,repo:string,path="",ref?:string){const q=ref?`?ref=${encodeURIComponent(ref)}`:"";return github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}${q}`);}
export async function getGitHubTree(owner:string,repo:string,ref="HEAD"){const branch=await getGitHubRepo(owner,repo);const selected=ref==="HEAD"?branch.default_branch:ref;return github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(selected)}?recursive=1`);}
