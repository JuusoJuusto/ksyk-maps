import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { recoverFromUnauthorized } from "@/lib/adminAuth";
import { mapScopeHeader } from "@/lib/builderMap";

function getAdminAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('ksyk_admin_token');
  // Builder pages also name the map being edited; nobody else sends it.
  return token ? { Authorization: `Bearer ${token}`, ...mapScopeHeader() } : {};
}

/**
 * fetch that survives an aged-out admin token: on a 401 it renews the token
 * once and replays the request. `build` runs again for the retry so the
 * headers pick up the fresh token.
 */
async function authedFetch(url: string, build: () => RequestInit): Promise<Response> {
  const res = await fetch(url, build());
  if (res.status !== 401 || !localStorage.getItem('ksyk_admin_token')) return res;
  if (!(await recoverFromUnauthorized())) return res;
  return fetch(url, build());
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await authedFetch(url, () => ({
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...getAdminAuthHeader(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  }));

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await authedFetch(queryKey.join("/") as string, () => ({
      credentials: "include",
      headers: { ...getAdminAuthHeader() },
    }));

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
