import axios, { type AxiosRequestConfig } from "axios";

/**
 * 对接 Vineyard 后端。HTTP 状态恒为 200，成败看响应体的 code：
 * 40100~40149 是凭证失效，先用 refresh token 换一次再重试；40150 / 40151 是账号到期 / 停用。
 */
const BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL || ""
  : "/api";

interface Envelope {
  code: number;
  message?: string;
  data?: unknown;
}

interface RetriableConfig extends AxiosRequestConfig {
  retried?: boolean;
}

const api = axios.create({ baseURL: BASE_URL });
/** 刷新专用：不经过下面的拦截器，避免刷新失败又触发刷新 */
const bare = axios.create({ baseURL: BASE_URL });

export function storeTokens(pair: { accessToken: string; refreshToken: string }) {
  localStorage.setItem("token", pair.accessToken);
  localStorage.setItem("refreshToken", pair.refreshToken);
}

export function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

function kickToLogin(): Promise<never> {
  clearAuthStorage();
  window.location.href = "/login";
  return new Promise(() => {});
}

let refreshing: Promise<boolean> | null = null;

/** 同一时刻只发一个刷新请求：refresh token 每次都轮换，并发刷新会让后到的失效 */
function refreshOnce(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;
    try {
      const res = await bare.post<Envelope>("/auth/refresh", { refreshToken });
      if (res.data?.code !== 0) return false;
      storeTokens(res.data.data as { accessToken: string; refreshToken: string });
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  async (res) => {
    const body = res.data as Envelope;
    if (body?.code === 0) return body.data as never;

    const code = body?.code;
    if (code === 40150 || code === 40151) return kickToLogin();
    if (code >= 40100 && code <= 40149) {
      const config = res.config as typeof res.config & RetriableConfig;
      const sentToken = String(config.headers.Authorization ?? "").replace("Bearer ", "");
      if (!config.retried && sentToken) {
        config.retried = true;
        // 并发请求里别人已经刷新过，直接用新 token 重试
        const fresh = localStorage.getItem("token") !== sentToken || (await refreshOnce());
        if (fresh) return api.request(config);
        return kickToLogin();
      }
      if (sentToken) return kickToLogin();
    }
    return Promise.reject(new Error(body?.message || "请求失败"));
  },
  (err) => {
    const status = err.response?.status;
    return Promise.reject(new Error(status ? `服务暂不可用（HTTP ${status}）` : "网络异常，请检查网络后重试"));
  },
);

export default api;
