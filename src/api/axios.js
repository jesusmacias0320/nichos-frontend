import axios from 'axios';

const instance = axios.create({
    baseURL: 'https://api-nichos-backend-hihx.onrender.com',
    withCredentials: true
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`; // Agrega el token
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;