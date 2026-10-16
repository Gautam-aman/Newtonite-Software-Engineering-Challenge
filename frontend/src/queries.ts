import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, params, type Item, type Page } from "./api";
export function useItems(
  values: Record<string, string | number | undefined>,
  retainPrevious = false,
) {
  return useQuery({
    queryKey: ["items", values],
    placeholderData: retainPrevious ? keepPreviousData : undefined,
    queryFn: () => api<Page<Item>>("/items?" + params(values)),
  });
}
