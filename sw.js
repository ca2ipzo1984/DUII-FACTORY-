// sw.js - Service Worker for Offline Caching (ISO 9009 Compliant)
const CACHE_NAME = 'duii-factory-v8.1.0-FIX-CHAT-FROZEN';
const ASSETS = [
  './index.html',
  './style.css',
  './modules.js',
  './app.js',
  './manifest.json',
  './avatar.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
