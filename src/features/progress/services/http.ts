/**
 * Thin wrapper around shared API http (axios) to match the { res, data } interface
 * expected by progressService.ts.
 */
import axiosInstance from '@/shared/services/api/http';

interface HttpOptions {
  method?: string;
  body?: string;
  authToken?: string | null;
}

export async function http(
  path: string,
  options: HttpOptions = {}
): Promise<{ res: { ok: boolean; status: number; headers: { get(name: string): string | null } }; data: any }> {
  const { method = 'GET', body, authToken } = options;
  const config: any = {
    method: method.toLowerCase(),
    url: path,
  };
  if (authToken) {
    config.headers = { ...config.headers, Authorization: `Bearer ${authToken}` };
  }
  if (body && (method === 'PUT' || method === 'POST' || method === 'PATCH')) {
    config.data = JSON.parse(body);
  }
  const response = await axiosInstance.request(config);
  return {
    res: {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      headers: {
        get(name: string) {
          const v = response.headers[name?.toLowerCase()];
          return v != null ? String(v) : null;
        },
      },
    },
    data: response.data,
  };
}
