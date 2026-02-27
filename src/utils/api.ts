export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  try {
    const token = localStorage.getItem("token");
    const headers = {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
      // Optional: Handle unauthorized globally (e.g., clear token and redirect to login)
      // But we'll let the components handle it or rely on ProtectedRoute
    }

    return response;
  } catch (error) {
    console.error("Fetch with auth error:", error);
    throw error; // Re-throw to propagate the error to the calling component
  }
};
