import {clearAuth, getAccessToken, setAccessToken} from "./state.js";


const API_PREFIX = '/api/v1';

export async function login(body) {
  if (!body) return;
  const response = await fetch(`${API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body,
    credentials: "include"
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw {
      status: response.status,
      message: errorData?.detail || `HTTP ${response.status}`,
      data: errorData,
      isApiError: true,
    };
  }

  const data = await response.json();
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  const response = await fetch(`${API_PREFIX}/auth/logout`, {
    method: 'POST',
    credentials: "include"
  });
  clearAuth();
  return true;
}

export async function refresh() {
  const response = await fetch(`${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    credentials: "include"
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearAuth();
    const errorData = await response.json();
    throw {
      status: response.status,
      message: errorData?.detail || `HTTP ${response.status}`,
      data: errorData,
      isApiError: true,
    };
  }

  const data = await response.json();
  setAccessToken(data.access_token);
  return data;
}

export async function getCurrentUser() {
  const accessToken = getAccessToken();
  const response = await fetch(`${API_PREFIX}/auth/current_user`, {
    method: 'GET',
    headers: {"Authorization": `Bearer ${accessToken}`},
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearAuth();
    const errorData = await response.json();
    throw {
      status: response.status,
      message: errorData?.detail || `HTTP ${response.status}`,
      data: errorData,
      isApiError: true,
    };
  }


  return await response.json();
}