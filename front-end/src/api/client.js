import axios from 'axios';
import { secureSession } from '../utils/secureStorage';

// Use the Vite proxy when in dev (/api → http://10.14.77.183:5000/api).
// In production, set VITE_API_URL to the full backend URL.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({ baseURL });

// Attach the encrypted-stored token to every request.
// Token is stored in sessionStorage so each browser tab has its own session.
apiClient.interceptors.request.use((config) => {
  const token = secureSession.getItem('sqms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
