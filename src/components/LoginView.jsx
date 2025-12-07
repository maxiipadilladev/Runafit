import React, { useState } from 'react';
import { User, Lock, Mail, LogIn, Zap, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const LoginView = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('alumna');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAlumnaLogin = async () => {
    if (dni.length < 7) {
      alert('Por favor ingresá un DNI válido');
      return;
    }

    setLoading(true);
    try {
      // Buscar usuario por DNI en Supabase
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('dni', dni)
        .single();

      if (error || !usuario) {
        alert('❌ DNI no encontrado. Consultá con el administrador.');
        return;
      }

      // Guardar sesión en localStorage
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      // Notificar al componente padre (App.jsx)
      if (onLogin) {
        onLogin(usuario);
      }
      
      alert(`✅ Bienvenida ${usuario.nombre}!`);
      
    } catch (error) {
      console.error('Error login:', error);
      alert('Error al iniciar sesión. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!email || !password) {
      alert('Por favor completá todos los campos');
      return;
    }

    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Buscar admin por email (usando campo telefono como username)
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('telefono', email)
        .eq('rol', 'admin')
        .single();

      if (error || !usuario) {
        alert('❌ Credenciales incorrectas');
        return;
      }

      // Verificar contraseña hasheada
      if (!usuario.password) {
        alert('❌ Este usuario no tiene contraseña configurada');
        return;
      }

      const passwordMatch = await bcrypt.compare(password, usuario.password);
      
      if (!passwordMatch) {
        alert('❌ Contraseña incorrecta');
        return;
      }

      // Login exitoso
      const usuarioSinPassword = { ...usuario };
      delete usuarioSinPassword.password; // No guardar password en localStorage
      
      localStorage.setItem('usuario', JSON.stringify(usuarioSinPassword));
      
      if (onLogin) {
        onLogin(usuarioSinPassword);
      }
      
      alert(`✅ Acceso admin autorizado para: ${usuario.nombre}`);
      
    } catch (error) {
      console.error('Error login admin:', error);
      alert('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e, handler) => {
    if (e.key === 'Enter') {
      handler();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-5xl font-black text-white">RUNA</div>
            <div className="text-5xl font-black text-pink-300">FIT</div>
          </div>
          <p className="text-white/80 text-lg">Sistema de Gestión Premium</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('alumna')}
              className={`flex-1 py-4 px-6 font-bold text-center transition-all ${
                activeTab === 'alumna'
                  ? 'bg-purple-50 text-purple-700 border-b-4 border-purple-600'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-5 h-5" />
                <span>Soy Alumna</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-4 px-6 font-bold text-center transition-all ${
                activeTab === 'admin'
                  ? 'bg-purple-50 text-purple-700 border-b-4 border-purple-600'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                <span>Soy Admin</span>
              </div>
            </button>
          </div>

          {/* Contenido Tabs */}
          <div className="p-8">
            {activeTab === 'alumna' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Hola de nuevo! 👋</h3>
                  <p className="text-gray-600">Ingresá tu DNI para acceder</p>
                </div>

                <div>
                  <label htmlFor="dni" className="block text-sm font-semibold text-gray-700 mb-2">
                    Tu DNI (sin puntos)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      id="dni"
                      type="text"
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      onKeyPress={(e) => handleKeyPress(e, handleAlumnaLogin)}
                      placeholder="12345678"
                      className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                      maxLength={8}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Solo números, sin puntos ni espacios</p>
                </div>

                <button
                  onClick={handleAlumnaLogin}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <LogIn className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                      <p className="font-semibold mb-1">Acceso Ultra Rápido</p>
                      <p className="text-purple-700">Sin contraseñas. Solo tu DNI y listo.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Panel Admin</h3>
                  <p className="text-gray-600">Acceso para administradores</p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@runafit.com"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, handleAdminLogin)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-600">Recordarme</span>
                  </label>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-semibold">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  onClick={handleAdminLogin}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Acceder al Panel</span>
                    </>
                  )}
                </button>

                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800 text-center">
                    🔒 Acceso seguro con encriptación SSL
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            ¿Problemas para ingresar?{' '}
            <button className="text-white font-semibold hover:underline">
              Contactá soporte
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LoginView;
