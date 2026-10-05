export const PLANS = {
  free:{id:"free",name:"Free",priceCents:0},
  pro:{id:"pro",name:"Pro",priceCents:0},
  r:{id:"r",name:"R",priceCents:0},
  ultra:{id:"ultra",name:"Ultra",priceCents:0},
} as const;
export type PlanId=keyof typeof PLANS;