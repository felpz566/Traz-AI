import {nextMonthlyDueDate,paymentDeadline} from "./dates";
import type {Subscription,SubscriptionStatus} from "./types";

export type PaymentResult={transactionHash?:string;paidAt:Date};

export function createSubscription(input:{id:string;userId:string;plan:string;paidAt:Date;transactionHash?:string}):Subscription{
  const dueAt=nextMonthlyDueDate(input.paidAt);
  return {id:input.id,userId:input.userId,plan:input.plan,status:"active",paidAt:input.paidAt.toISOString(),dueAt:dueAt.toISOString(),deadlineAt:paymentDeadline(dueAt).toISOString(),lastTransactionHash:input.transactionHash};
}

export function evaluateSubscription(subscription:Subscription,now=new Date()):SubscriptionStatus{
  if(subscription.status==="canceled") return "canceled";
  const due=new Date(subscription.dueAt);
  const deadline=new Date(subscription.deadlineAt);
  if(now<due) return "active";
  if(now<=deadline) return "grace";
  return "canceled";
}

export function applySuccessfulPayment(subscription:Subscription,payment:PaymentResult):Subscription{
  const paidAt=payment.paidAt;
  const dueAt=nextMonthlyDueDate(paidAt);
  return {...subscription,status:"active",paidAt:paidAt.toISOString(),dueAt:dueAt.toISOString(),deadlineAt:paymentDeadline(dueAt).toISOString(),lastTransactionHash:payment.transactionHash??subscription.lastTransactionHash};
}
