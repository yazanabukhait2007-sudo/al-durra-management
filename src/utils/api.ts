export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
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
};
