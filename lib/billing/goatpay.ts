import {env} from "@/lib/env";
const BASE="https://api.goatpayments.com.br/api/public/v1";
async function request<T>(path:string,init:RequestInit={}):Promise<T>{const response=await fetch(BASE+path,{...init,headers:{"Content-Type":"application/json","api_token":env.goatpayToken,...(init.headers||{})},cache:"no-store"});const text=await response.text();let data:unknown;try{data=JSON.parse(text)}catch{data={raw:text}}if(!response.ok)throw new Error(typeof data==="object"&&data&&"message" in data?String((data as {message:unknown}).message):"GoatPay request failed");return data as T}
export function createTransaction(payload:Record<string,unknown>){return request("/transactions",{method:"POST",body:JSON.stringify(payload)})}
export function listProducts(){return request("/products")}
export function listOffers(){return request("/offers")}
export function getTransaction(hash:string){return request("/transactions/"+encodeURIComponent(hash))}
