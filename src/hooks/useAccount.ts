import { queryOptions, useQuery } from "@tanstack/react-query";
import { getAccount } from "@/lib/account.functions";

export const accountQueryOptions = queryOptions({
  queryKey: ["account"],
  queryFn: () => getAccount(),
  staleTime: 15_000,
});

export function useAccount() {
  return useQuery(accountQueryOptions);
}
