// Gym Log Pro service worker: offline support, updates arrive when online.
var CACHE="gymlog-v13";
var SCRIPTS=["data","core","config","comments","push","sync","i18n","effects","logic","animation","photos","timer","dialogs","train","muscles","body","meals","plan","focus","account","app","vendor/supabase"];
var SHELL=["./","index.html","privacy.html","coach.html","css/app.css","css/coach.css","js/coach.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"]
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
  // the account's data (Supabase) always comes from the network: a cached answer would hide new changes
  if(/\.supabase\.co$/.test(url.hostname))return;
  var sameOrigin=url.origin===self.location.origin;
  // only the app itself is stored as index.html; other pages (privacy.html) are cached under their own name
  var isPage=sameOrigin&&/\/(index\.html)?$/.test(url.pathname);
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

// Notifications from the server (supabase/functions/push): {title, body, url, tag, lang}, written in
// the language of the phone they were sent to. Open pages hear about it too, so they fetch the news now.
self.addEventListener("push",function(e){
  var d={};
  try{d=e.data?e.data.json():{};}catch(x){d={body:e.data?e.data.text():""};}
  var o={body:String(d.body||""),icon:"icon-192.png",badge:"icon-192.png",tag:String(d.tag||"gymlog-news"),renotify:true,data:{url:String(d.url||"./")}};
  if(d.lang==="ar"){o.lang="ar";o.dir="rtl";}
  e.waitUntil(Promise.all([
    self.registration.showNotification(String(d.title||"Gym Log"),o),
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){cs.forEach(function(c){c.postMessage({type:"push",tag:o.tag});});})
  ]));
});
// A tap opens the page it points at (the app, or the coach page), reusing a window already showing it.
function samePage(a,b){
  var p=function(u){return new URL(u,self.registration.scope).pathname.replace(/\/index\.html$/,"/");};
  return p(a)===p(b);
}
self.addEventListener("notificationclick",function(e){
  e.notification.close();
  var url=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){
      if(samePage(cs[i].url,url)&&"focus" in cs[i]){cs[i].postMessage({type:"open",url:url});return cs[i].focus();}
    }
    return self.clients.openWindow(url);
  }));
});
