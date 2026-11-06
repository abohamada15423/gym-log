// Render shell, tab switching and start-up. Loaded last.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- RENDER SHELL ---------- */
// A pill that slides behind the active tab icon.
var navBar = document.querySelector("nav.bar"), navInd = h("span", { class: "nav-ind", "aria-hidden": "true" });
navBar.insertBefore(navInd, navBar.firstChild); navBar.classList.add("has-ind");
// Layout offsets, not getBoundingClientRect: the active icon pops (scales) as it is selected.
function placeNavInd() {
  var nb = $("t-" + tab), g = nb && nb.querySelector(".gl"); if (!g || !g.offsetWidth) return;
  navInd.style.width = g.offsetWidth + "px"; navInd.style.height = g.offsetHeight + "px";
  navInd.style.transform = "translate(" + (nb.offsetLeft + g.offsetLeft) + "px," + (nb.offsetTop + g.offsetTop) + "px)";
  if (!navInd.classList.contains("ready")) requestAnimationFrame(function () { navInd.classList.add("ready"); });
}
window.addEventListener("resize", placeNavInd);

function render() {
  clearAnimLoops();
  ["train", "body", "meals", "plan"].forEach(function (t) {
    $("t-" + t).setAttribute("aria-selected", String(t === tab));
  });
  var root = $("view"); root.textContent = "";
  document.body.setAttribute("data-tab", tab);
  $("page-title").textContent = { train: "Let's train", body: "Progress", meals: "Meals", plan: "Your plan" }[tab];
  $("today-lbl").textContent = mbDay(today());
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
  placeNavInd();
}

["train", "body", "meals", "plan"].forEach(function (t) {
  $("t-" + t).onclick = function () { tab = t; window.scrollTo(0, 0); fx.enter = true; render(); };
});

load();
applyLang();
fx.enter = true;
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { }); });
}
