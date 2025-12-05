# RunaFit

Proyecto de mockup con stack moderno.

## 🚀 Stack Tecnológico

- **React 18** - Biblioteca UI
- **Vite** - Build tool y dev server
- **TailwindCSS** - Framework CSS utility-first
- **Docker** - Containerización del entorno de desarrollo

## 📦 Estructura del Proyecto

```
RunaFit/
├── src/
│   ├── App.jsx          # Componente principal
│   ├── main.jsx         # Punto de entrada
│   └── index.css        # Estilos globales + Tailwind
├── public/              # Archivos estáticos
├── Dockerfile           # Configuración Docker
├── docker-compose.yml   # Orquestación de contenedores
├── vite.config.js       # Configuración de Vite
├── tailwind.config.js   # Configuración de Tailwind
└── package.json         # Dependencias del proyecto
```

## 🐳 Ejecutar con Docker

### Iniciar el proyecto:

```bash
docker-compose up
```

El servidor estará disponible en: http://localhost:5173

### Detener el proyecto:

```bash
docker-compose down
```

### Reconstruir contenedor (si cambias dependencias):

```bash
docker-compose up --build
```

## 💻 Comandos útiles

### Ejecutar comandos dentro del contenedor:

```bash
# Instalar una nueva dependencia
docker-compose exec frontend npm install <paquete>

# Ejecutar build
docker-compose exec frontend npm run build

# Abrir shell en el contenedor
docker-compose exec frontend sh
```

## 🎨 Desarrollo

El proyecto está configurado con:
- Hot Module Replacement (HMR) para desarrollo rápido
- TailwindCSS con clases utility-first
- ESLint para mantener código limpio
- Estructura de carpetas escalable

## 📝 Notas

- No necesitas Node.js instalado localmente
- Todo se ejecuta dentro de Docker
- Los cambios se reflejan automáticamente gracias a los volumes
