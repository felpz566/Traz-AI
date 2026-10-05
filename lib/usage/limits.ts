export type UsageMetric="messages"|"files"|"projects"|"agents";
export const USAGE_LIMITS={free:{messages:100,files:10,projects:3,agents:0},pro:{messages:2000,files:100,projects:25,agents:10},r:{messages:5000,files:250,projects:100,agents:50},ultra:{messages:20000,files:1000,projects:500,agents:200}} as const;
