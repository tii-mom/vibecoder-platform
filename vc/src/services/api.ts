// STUB: Mock Service for Sandbox
export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    // Basic service fetcher
    console.log(`[API GET] requesting: ${endpoint}`);
    return {} as T;
  },
  post: async <T>(endpoint: string, body: any): Promise<T> => {
    console.log(`[API POST] requesting: ${endpoint}`, body);
    return {} as T;
  }
};
