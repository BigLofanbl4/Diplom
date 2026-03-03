import { refresh, getCurrentUser } from "./api.js";

const state = {
  authStatus: "anonymous",
  user: null,
  role: "guest",
  isLoading: true,
  accessToken: null
};

export function getAuthState() {
  return { ...state };
}

export function getAuthStatus() {
  return state.authStatus;
}

export function getAuthUser() {
  if (state.user) {
    state.isLoading = false;
    return state.user;
  }

  return null;
}

export function setUser(user) {
  state.user = user;
  state.role = user.role ?? "guest";
  state.authStatus = "authenticated";
}

export function clearAuth() {
  state.user = null;
  state.role = "guest";
  state.authStatus = "anonymous";
  state.accessToken = null;
}

export async function initAuthState() {
  state.isLoading = true;
  try {
    await refresh();
    const user = await getCurrentUser();
    setUser(user);
  } catch (error) {
    clearAuth();
  } finally {
    state.isLoading = false;
  }
}

export function getAccessToken() {
  return state.accessToken;
}

export function setAccessToken(newAccessToken) {
  state.accessToken = newAccessToken;
}

export function hasAccessToken() {
  return Boolean(state.accessToken);
}
