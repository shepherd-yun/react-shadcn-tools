import axios from "axios";

const BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL || ""
  : "/api";

const api = axios.create({
  baseURL: BASE_URL,
});

// 请求拦截：自动携带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一解包 { code, data, message }
api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return new Promise(() => {});
    }
    const msg = err.response?.data?.message || err.message || "请求失败";
    return Promise.reject(new Error(msg));
  },
);

export default api;
