# Dockerfile para desarrollo con Node.js
FROM node:20-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache git

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json si existe (se creará después)
COPY package*.json ./

# Exponer puerto de Vite
EXPOSE 5173

# Comando por defecto para desarrollo
CMD ["npm", "run", "dev"]
