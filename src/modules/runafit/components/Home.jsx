import React from 'react';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              RunaFit
            </h1>
            <p className="text-xl text-gray-600">
              Sistema de gestión de turnos y reservas
            </p>
          </header>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg">
                <h2 className="text-2xl font-semibold text-blue-900 mb-3">
                  React + Vite
                </h2>
                <p className="text-gray-700">
                  Desarrollo rápido con Hot Module Replacement
                </p>
              </div>

              <div className="p-6 bg-indigo-50 rounded-lg">
                <h2 className="text-2xl font-semibold text-indigo-900 mb-3">
                  TailwindCSS
                </h2>
                <p className="text-gray-700">
                  Estilos modernos con utility-first CSS
                </p>
              </div>

              <div className="p-6 bg-purple-50 rounded-lg">
                <h2 className="text-2xl font-semibold text-purple-900 mb-3">
                  Docker
                </h2>
                <p className="text-gray-700">
                  Entorno de desarrollo containerizado
                </p>
              </div>

              <div className="p-6 bg-pink-50 rounded-lg">
                <h2 className="text-2xl font-semibold text-pink-900 mb-3">
                  Listo para producción
                </h2>
                <p className="text-gray-700">
                  Configuración profesional desde el inicio
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
