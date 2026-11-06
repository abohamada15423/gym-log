// Render shell, tab switching and start-up. Loaded last.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- RENDER SHELL ---------- */
function render() {
  clearAnimLoops();
  ["train", "body", "meals", "plan"].forEach(function (t) {
    $("t-" + t).setAttribute("aria-selected", String(t === tab));
  });
  var root = $("view"); root.textContent = "";
  if (tab === "train") renderTrain(root);
  else if (tab === "body") renderBody(root);
  else if (tab === "meals") renderMeals(root);
  else renderPlan(root);
  if (fx.enter && !REDUCED) {
    root.classList.add("enter");
    for (var i = 0; i < root.children.length; i++)root.children[i].style.setProperty("--i", String(Math.min(i, 10)));
    clearTimeout(render._t); render._t = setTimeout(function () { root.classList.remove("enter"); }, 1200);
  } else root.classList.remove("enter");
  fx.enter = false; fx.pop = null;
}

["train", "body", "meals", "plan"].forEach(function (t) {
  $("t-" + t).onclick = function () { tab = t; window.scrollTo(0, 0); fx.enter = true; render(); };
});

load();
fx.enter = true;
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { }); });
}
