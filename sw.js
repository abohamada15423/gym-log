// Gym Log Pro service worker: offline support, updates arrive when online.
var CACHE="gymlog-v9";
var SCRIPTS=["data","core","i18n","effects","logic","animation","photos","timer","dialogs","train","muscles","body","meals","plan","focus","app"];
var SHELL=["./","index.html","css/app.css","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"]
  .concat(SCRIPTS.map(function(n){return "js/"+n+".js";}));
self.addEventListener("install",function(e){
  // Cache each file on its own: one missing file must not stop the worker installing.
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){return c.add(u).catch(function(){});}));
  }).then(function(){return self.skipWaiting();}));
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
  if(sameOrigin){
    // the app's own scripts and styles: network first too, so a new page never runs old code
    e.respondWith(fetch(req).then(function(r){
      if(r&&r.ok){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
      return r;
    }).catch(function(){return caches.match(req,{ignoreSearch:true});}));
    return;
  }
  // everything else (fonts): cache first, then network and remember it
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
