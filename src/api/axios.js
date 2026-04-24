import axios from 'axios';

const instance = axios.create({
    baseURL: 'https://api-nichos-backend-hihx.onrender.com',
    withCredentials: true
});

export default instance;