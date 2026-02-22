export default class BaseService {
  static BASE_URL = "/api";
  
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
        const errorData = await response.json().catch(() => {});
        throw new Error(JSON.stringify({
          message: errorData.detail || `Iternal Server Error: ${response.status}`,
          status: response.status,
        }));
      }

      return await response.json();
    } catch (error) {
      console.error(`API ERROR ${url}:`, error);
      throw error;
    }
  }
}