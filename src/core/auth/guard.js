import { getAuthStatus } from "./state.js";


export function isAuthenticated() {
  return getAuthStatus() === "authenticated";
}