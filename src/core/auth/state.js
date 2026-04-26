import { refresh, getCurrentUser } from "./api.js";

const ACCESS_TOKEN_STORAGE_KEY = "diplom_access_token";

function readStoredAccessToken() {
  try {
    return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredAccessToken(token) {
  try {
    if (token) {
      window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // noop: storage can be unavailable in private mode or restricted environments
  }
}

const state = {
  authStatus: "anonymous",
  user: null,
  role: "guest",
  isLoading: true,
  accessToken: readStoredAccessToken()
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
  writeStoredAccessToken(null);
}

export async function initAuthState() {
  state.isLoading = true;
  try {
    if (state.accessToken) {
      try {
        const user = await getCurrentUser();
        setUser(user);
        return;
      } catch (error) {
        if (error?.status !== 401 && error?.status !== 403) {
          throw error;
        }
        state.accessToken = null;
        writeStoredAccessToken(null);
      }
    }

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
  writeStoredAccessToken(newAccessToken);
}

export function hasAccessToken() {
  return Boolean(state.accessToken);
}
