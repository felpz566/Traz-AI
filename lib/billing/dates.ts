function daysInUtcMonth(year:number, month:number){return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();}

export function addBusinessDays(input:Date, days:number){
  if(days<0) throw new Error("days must be non-negative");
  const date=new Date(input);
  let added=0;
  while(added<days){
    date.setUTCDate(date.getUTCDate()+1);
    const day=date.getUTCDay();
    if(day!==0&&day!==6) added++;
  }
  return date;
}

export function nextMonthlyDueDate(paidAt:Date){
  const year=paidAt.getUTCFullYear();
  const month=paidAt.getUTCMonth()+1;
  const day=Math.min(paidAt.getUTCDate(),daysInUtcMonth(year,month));
  return new Date(Date.UTC(year,month,day,paidAt.getUTCHours(),paidAt.getUTCMinutes(),paidAt.getUTCSeconds(),paidAt.getUTCMilliseconds()));
}

export function paymentDeadline(dueDate:Date){return addBusinessDays(dueDate,10);}
