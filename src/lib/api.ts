// 统一的 API 请求封装：自动携带 token、处理错误、拼接地址
// 本地开发时走 Vite 代理；部署后默认同源（空字符串），也可用 VITE_API_BASE 指定独立后端地址
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers, ...rest } = options;
  const token = localStorage.getItem('token');

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers: finalHeaders,
    body: payload,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError((data as { message?: string }).message || '请求失败，请稍后重试', response.status);
  }

  return data as T;
}

export const uploadFile = async (file: File, field = 'file'): Promise<string> => {
  const formData = new FormData();
  formData.append(field, file);
  const data = await api<{ url: string }>('/api/upload', { method: 'POST', body: formData });
  return data.url;
};
