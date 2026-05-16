const API_URL = '/api';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('tripflow_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  } else if (config.body instanceof FormData) {
    // Let the browser set the content type for multipart/form-data
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('tripflow_token');
      window.location.href = '/index.html';
    }
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}
