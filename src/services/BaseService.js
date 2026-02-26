export default class BaseService {
  static BASE_URL = "/api/v1";
  
  static async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;

    const isFormData = options.body instanceof FormData;

    const headers = {
      ...options.headers
    };

    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {...options, headers});

      if (response.status === 204) return true;

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw {
          status: response.status,
          message: errorData?.detail || `HTTP ${response.status}`,
          data: errorData,
          isApiError: true,
        };
      }

      return await response.json();
    } catch (error) {
      if (error?.isApiError) throw error;

      // network / CORS / abort / invalid JSON etc.
      throw {
        status: 0,
        message: error?.message || "Network error",
        isNetworkError: true,
        originalError: error,
      };
    }
  }
}
