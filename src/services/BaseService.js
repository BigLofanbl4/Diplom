export default class BaseService {
  static BASE_URL = "/api";
  
  static async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    try {
      const response = await fetch(url, {...options, headers});

      if (response.status === 204) return true;

      if (!response.ok) {
        const errorData = await response.json().catch(() => {});
        throw new Error(errorData.detail || `Iternal Server Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API ERROR ${url}:`, error);
      throw error;
    }
  }
}