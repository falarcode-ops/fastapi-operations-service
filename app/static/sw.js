// Service Worker desactivado para evitar conflictos de almacenamiento en caché
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => caches.delete(key)));
        }).then(() => self.clients.claim())
    );
});
