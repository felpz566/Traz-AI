export type GoatPayPostback={
  transaction_hash:string;
  status:string;
  amount?:number;
  payment_method?:string;
  paid_at?:string;
};

const PAYMENT_STATUSES=new Set(["paid","approved","completed","success"]);

export function parseGoatPayPostback(input:unknown):GoatPayPostback{
  if(!input||typeof input!=="object") throw new Error("Invalid GoatPay postback");
  const body=input as Record<string,unknown>;
  if(typeof body.transaction_hash!=="string"||!body.transaction_hash.trim()) throw new Error("Missing transaction_hash");
  if(typeof body.status!=="string"||!body.status.trim()) throw new Error("Missing status");
  return {
    transaction_hash:body.transaction_hash,
    status:body.status,
    amount:typeof body.amount==="number"?body.amount:undefined,
    payment_method:typeof body.payment_method==="string"?body.payment_method:undefined,
    paid_at:typeof body.paid_at==="string"?body.paid_at:undefined,
  };
}

export function isSuccessfulPayment(status:string){return PAYMENT_STATUSES.has(status.toLowerCase());}
