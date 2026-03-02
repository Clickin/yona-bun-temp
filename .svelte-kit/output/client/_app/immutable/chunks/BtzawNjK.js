import {
  D as v,
  E as u,
  F as T,
  T as p,
  G as h,
  H as l,
  h as i,
  f as s,
  R as E,
  I as y,
  c as d,
  J as g,
  K as w,
  L as N,
} from "./CYuLPLop.js";
const L =
  globalThis?.window?.trustedTypes &&
  globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (t) => t });
function M(t) {
  return L?.createHTML(t) ?? t;
}
function x(t) {
  var r = v("template");
  return ((r.innerHTML = M(t.replaceAll("<!>", "<!---->"))), r.content);
}
function n(t, r) {
  var e = l;
  e.nodes === null && (e.nodes = { start: t, end: r, a: null, t: null });
}
function b(t, r) {
  var e = (r & p) !== 0,
    f = (r & h) !== 0,
    a,
    _ = !t.startsWith("<!>");
  return () => {
    if (i) return (n(s, null), s);
    a === void 0 && ((a = x(_ ? t : "<!>" + t)), e || (a = u(a)));
    var o = f || T ? document.importNode(a, !0) : a.cloneNode(!0);
    if (e) {
      var c = u(o),
        m = o.lastChild;
      n(c, m);
    } else n(o, o);
    return o;
  };
}
function I(t = "") {
  if (!i) {
    var r = d(t + "");
    return (n(r, r), r);
  }
  var e = s;
  return (e.nodeType !== g ? (e.before((e = d())), w(e)) : N(e), n(e, e), e);
}
function O() {
  if (i) return (n(s, null), s);
  var t = document.createDocumentFragment(),
    r = document.createComment(""),
    e = d();
  return (t.append(r, e), n(r, e), t);
}
function P(t, r) {
  if (i) {
    var e = l;
    (((e.f & E) === 0 || e.nodes.end === null) && (e.nodes.end = s), y());
    return;
  }
  t !== null && t.before(r);
}
const A = "5";
typeof window < "u" && ((window.__svelte ??= {}).v ??= new Set()).add(A);
export { P as a, n as b, O as c, b as f, I as t };
