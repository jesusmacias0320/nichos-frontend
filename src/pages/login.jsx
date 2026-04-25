import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Login.css';

const Login = () => {
  // 1. ZONA DE HOOKS (Solo pueden ir aquí, en la raíz del componente)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // <-- El Hook se inicializa aquí arriba

  // 2. ZONA DE FUNCIONES
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      
      // Aquí abajo solo USAMOS la variable que creamos arriba, sin la palabra "use"
      navigate('/dashboard'); 
      
    } catch (err) {
      console.log("Detalle del error:", err.response ? err.response.data : err);
      setError('Credenciales incorrectas');
    }
  };

  // 3. ZONA VISUAL
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Iniciar Sesión</h2>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="admin@nichos.com"
            />
          </div>
          
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;