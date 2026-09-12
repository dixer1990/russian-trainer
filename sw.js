/* ------------------------------------------------------------------
   Офлайн-режим для тренажёров «ЕГЭшь».

   КОГДА НУЖНО МЕНЯТЬ ЭТОТ ФАЙЛ

   1. Загрузили новый тренажёр — допишите его имя в список FILES ниже.
   2. После любой правки этого файла увеличьте номер в VERSION
      (было 'v1' — станет 'v2'). Иначе телефоны учеников
      продолжат пользоваться старым списком файлов.

   Правки в самих тренажёрах и в index.html здесь отмечать не нужно:
   страницы всегда сначала берутся из интернета и только при его
   отсутствии — из памяти устройства.
   ------------------------------------------------------------------ */

var VERSION = 'v1';
var CACHE = 'egesh-' + VERSION;

var FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './zadanie09.html',
  './zadanie10.html',
  './zadanie11.html',
  './zadanie12.html',
  './zadanie14.html',
  './zadanie15.html'
];

/* Установка: складываем файлы в память устройства.
   Каждый файл добавляем отдельно — если один не найдётся,
   остальные всё равно сохранятся. */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(
        FILES.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* Активация: убираем память от прежних версий. */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.map(function (name) {
          if (name !== CACHE && name.indexOf('egesh-') === 0) {
            return caches.delete(name);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Запросы.
   Страницы и скрипты: сначала интернет, потом память устройства.
   Так правки видны сразу, а без интернета всё равно открывается.
   Шрифты: сначала память — они не меняются. */
self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  var isFont =
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if (isFont) {
    event.respondWith(
      caches.match(request).then(function (hit) {
        if (hit) return hit;
        return fetch(request).then(function (response) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy).catch(function () {});
          });
          return response;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy).catch(function () {});
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (hit) {
          if (hit) return hit;
          /* Нет ни интернета, ни сохранённой страницы —
             открываем меню, оно сохранено при установке. */
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return Response.error();
        });
      })
  );
});
