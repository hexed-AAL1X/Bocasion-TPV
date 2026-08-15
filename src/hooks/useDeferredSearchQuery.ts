import { useDeferredValue } from "react";

/** Separa lo que escribe el usuario del filtrado de la tabla para mantener el input fluido. */
export function useDeferredSearchQuery(query: string) {
  const deferredQuery = useDeferredValue(query.trim());
  return {
    deferredQuery,
    isSearchPending: deferredQuery !== query.trim(),
  };
}
