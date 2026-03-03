import { refresh } from "../core/auth/api.js";
import {clearAuth, getAccessToken} from "../core/auth/state.js";


let refreshPromise = null;

async function refreshWithLock() {
  if (!refreshPromise) {
    refreshPromise = refresh().finally(() => refreshPromise = null);
  }
  return refreshPromise;
}

function buildHeaders(options, { auth }) {
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  const token = getAccessToken();
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function readBody(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function apiError(response, data, fallback = `HTTP ${response.status}`) {
  return {
    status: response.status,
    message: data?.detail || fallback,
    data: data,
    isApiError: true
  }
}

export default class BaseService {
  static BASE_URL = "/api/v1";
  
  static async request(endpoint, options = {}, { auth = true } = {}) {
    const url = `${this.BASE_URL}${endpoint}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = buildHeaders(options, { auth });

      let response;
      try {
        response = await fetch(url, { ...options, headers });
      } catch (error) {
        // network / CORS / abort / invalid JSON etc.
        throw {
          status: 0,
          message: error?.message || "Network error",
          isNetworkError: true,
          originalError: error,
        };
      }

      const data = await readBody(response);

      if (response.ok) return data ?? true;

      if (response.status === 401 && auth && attempt === 0) {
        try {
          await refreshWithLock();
          continue;
        } catch {
          clearAuth();
          throw apiError(response, data);
        }
      }

      if (response.status === 401 && auth) clearAuth();


      throw apiError(response, data);
    }
  }
}
