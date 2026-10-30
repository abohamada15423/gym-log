// Gym Log Pro service worker: offline support, updates arrive when online.
var CACHE="gymlog-v4";
var SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET")return;
  var url=new URL(req.url);
  var sameOrigin=url.origin===self.location.origin;
  var isPage=req.mode==="navigate"||(sameOrigin&&/\/(index\.html)?$/.test(url.pathname));
  if(isPage){
    // network first so new versions show up, fall back to cache offline
    e.respondWith(fetch(req).then(function(r){
      var copy=r.clone();caches.open(CACHE).then(function(c){c.put("index.html",copy);});
      return r;
    }).catch(function(){return caches.match("index.html").then(function(m){return m||caches.match("./");});}));
    return;
  }
  // everything else (icons, fonts): cache first, then network and remember it
  e.respondWith(caches.match(req).then(function(hit){
    if(hit)return hit;
    return fetch(req).then(function(r){
      if(r&&(r.status===200||r.type==="opaque")){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
      return r;
    });
  }));
});

self.addEventListener("notificationclick",function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){if("focus" in cs[i])return cs[i].focus();}
    return self.clients.openWindow("./");
  }));
});
