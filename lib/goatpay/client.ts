const BASE_URL="https://api.goatpayments.com.br/api/public/v1";

export async function goatpayRequest<T>(path:string,init:RequestInit={}):Promise<T>{
  const token=process.env.GOATPAY_API_TOKEN;
  if(!token)throw new Error("GOATPAY_API_TOKEN is not configured");
  const response=await fetch(`${BASE_URL}${path}`,{
    ...init,
    headers:{"Content-Type":"application/json","api_token":token,...init.headers},
    cache:"no-store",
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(`GoatPay request failed: ${response.status}`);
  return data as T;
}