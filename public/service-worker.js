// Service Worker simple para cumplir criterios PWA
self.addEventListener('install', (event) => {
    console.log('Service Worker: Instalado');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activado');
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Estrategia Network Only por defecto para evitar problemas de caché en desarrollo
    // PWA requiere un fetch handler para ser instalable
    event.respondWith(fetch(event.request));
});
