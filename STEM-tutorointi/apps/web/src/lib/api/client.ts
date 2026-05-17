/**
 * API Client
 * Typed fetch wrapper for frontend API calls
 */

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

function buildUrl(url: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams(params);
  return `${url}?${search.toString()}`;
}

async function request<T = unknown>(
  url: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers: extraHeaders, ...rest } = options;

  const response = await fetch(buildUrl(url, params), {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Request failed',
      code: data.code,
    };
  }

  return {
    success: true,
    data: data.data ?? data,
  };
}

export const api = {
  get: <T = unknown>(url: string, options?: ApiOptions) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
    request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown, options?: ApiOptions) =>
    request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: ApiOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};

export type { ApiResponse, ApiOptions };
