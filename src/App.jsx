import { useState } from 'react';
import { Home as HomeIcon, Calendar, LayoutDashboard, Shield, Zap, LogIn } from 'lucide-react';
import Home from './components/Home';
import ClientBookingView from './components/ClientBookingView';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import LoginView from './components/LoginView';

function App() {
  const [currentView, setCurrentView] = useState('login');

  const views = {
    login: { component: LoginView, name: 'Login', icon: LogIn },
    landing: { component: LandingPage, name: 'Landing', icon: Zap },
    home: { component: Home, name: 'Inicio', icon: HomeIcon },
    bookings: { component: ClientBookingView, name: 'Cliente', icon: Calendar },
    admin: { component: AdminDashboard, name: 'Admin', icon: Shield },
  };

  const CurrentComponent = views[currentView].component;

  return (
    <div className="min-h-screen">
      {/* Navegación */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" />
              <span className="font-bold text-xl text-gray-800">RunaFit Demo</span>
            </div>
            
            <div className="flex gap-2">
              {Object.entries(views).map(([key, view]) => {
                const Icon = view.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setCurrentView(key)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${currentView === key
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{view.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Vista Actual */}
      <CurrentComponent />
    </div>
  );
}

export default App
