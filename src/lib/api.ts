import axios from 'axios';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  // axios >= 1.6 chỉ gắn header X-XSRF-TOKEN cho request khác origin khi bật cờ này
  withXSRFToken: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    // Chỉ auto-refresh/redirect khi request gốc có Bearer token (tức user tưởng đã đăng nhập).
    // Nếu không có token, 401 nghĩa là "chưa đăng nhập" (vd bootstrap silent-refresh của khách
    // ẩn danh) — không phải phiên hết hạn, nên không được ép redirect sang /login.
    const hadAuthHeader = Boolean(original?.headers?.Authorization);
    if (err.response?.status === 401 && hadAuthHeader && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await api.post('/api/auth/refresh');
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        queue.forEach((cb) => cb(newToken));
        queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        queue = [];
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);
