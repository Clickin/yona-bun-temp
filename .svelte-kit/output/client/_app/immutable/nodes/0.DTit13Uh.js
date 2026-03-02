import { a as X, f as $ } from "../chunks/BtzawNjK.js";
import {
  c as P,
  M as j,
  h as C,
  K as Y,
  E as sa,
  I as oa,
  o as F,
  N as ia,
  O as fa,
  P as G,
  Q as B,
  f as O,
  S as ta,
  U as la,
  V as q,
  a as ua,
  W as S,
  b as U,
  X as va,
  s as ca,
  Y as da,
  Z as pa,
  _ as V,
  $ as ha,
  a0 as _a,
  a1 as ga,
  a2 as Q,
  a3 as ma,
  r as aa,
  p as ea,
  a4 as D,
  a5 as ya,
  a6 as Ea,
  d as Ta,
  a7 as Aa,
  a8 as Na,
  a9 as Sa,
  aa as ba,
  ab as wa,
  ac as Ia,
  ad as Ma,
  v as Ca,
  w as ka,
  x as W,
  y as xa,
  z as k,
  n as Ra,
  A as I,
  B as x,
} from "../chunks/CYuLPLop.js";
import { s as Ha } from "../chunks/DVxR7C2P.js";
import { B as La, l as za, a as R } from "../chunks/DswxB6EI.js";
import { b as Oa } from "../chunks/BD3U-b1t.js";
import { p as Fa } from "../chunks/6vG7ubTH.js";
function Pa(a, e) {
  return e;
}
function Ya(a, e, r) {
  for (var l = [], f = e.length, i, t = e.length, s = 0; s < f; s++) {
    let v = e[s];
    ea(
      v,
      () => {
        if (i) {
          if ((i.pending.delete(v), i.done.add(v), i.pending.size === 0)) {
            var p = a.outrogroups;
            (K(V(i.done)), p.delete(i), p.size === 0 && (a.outrogroups = null));
          }
        } else t -= 1;
      },
      !1,
    );
  }
  if (t === 0) {
    var u = l.length === 0 && r !== null;
    if (u) {
      var o = r,
        c = o.parentNode;
      (Ea(c), c.append(o), a.items.clear());
    }
    K(e, !u);
  } else ((i = { pending: new Set(e), done: new Set() }), (a.outrogroups ??= new Set()).add(i));
}
function K(a, e = !0) {
  for (var r = 0; r < a.length; r++) Ta(a[r], e);
}
var Z;
function Ba(a, e, r, l, f, i = null) {
  var t = a,
    s = new Map();
  {
    var u = a;
    t = C ? Y(sa(u)) : u.appendChild(P());
  }
  C && oa();
  var o = null,
    c = da(() => {
      var d = r();
      return pa(d) ? d : d == null ? [] : V(d);
    }),
    v,
    p = !0;
  function b() {
    ((g.fallback = o),
      Da(g, v, t, e, l),
      o !== null &&
        (v.length === 0
          ? (o.f & S) === 0
            ? aa(o)
            : ((o.f ^= S), z(o, null, t))
          : ea(o, () => {
              o = null;
            })));
  }
  var n = j(() => {
      v = F(c);
      var d = v.length;
      let h = !1;
      if (C) {
        var _ = ia(t) === fa;
        _ !== (d === 0) && ((t = G()), Y(t), B(!1), (h = !0));
      }
      for (var y = new Set(), T = ua, w = ca(), A = 0; A < d; A += 1) {
        C && O.nodeType === ta && O.data === la && ((t = O), (h = !0), B(!1));
        var H = v[A],
          m = l(H, A),
          E = p ? null : s.get(m);
        (E
          ? (E.v && q(E.v, H), E.i && q(E.i, A), w && T.unskip_effect(E.e))
          : ((E = Ua(s, p ? t : (Z ??= P()), H, m, A, f, e, r)), p || (E.e.f |= S), s.set(m, E)),
          y.add(m));
      }
      if (
        (d === 0 &&
          i &&
          !o &&
          (p ? (o = U(() => i(t))) : ((o = U(() => i((Z ??= P())))), (o.f |= S))),
        d > y.size && va(),
        C && d > 0 && Y(G()),
        !p)
      )
        if (w) {
          for (const [ra, na] of s) y.has(ra) || T.skip_effect(na.e);
          (T.oncommit(b), T.ondiscard(() => {}));
        } else b();
      (h && B(!0), F(c));
    }),
    g = { effect: n, items: s, outrogroups: null, fallback: o };
  ((p = !1), C && (t = O));
}
function L(a) {
  for (; a !== null && (a.f & ya) === 0; ) a = a.next;
  return a;
}
function Da(a, e, r, l, f) {
  var i = e.length,
    t = a.items,
    s = L(a.effect.first),
    u,
    o = null,
    c = [],
    v = [],
    p,
    b,
    n,
    g;
  for (g = 0; g < i; g += 1) {
    if (((p = e[g]), (b = f(p, g)), (n = t.get(b).e), a.outrogroups !== null))
      for (const m of a.outrogroups) (m.pending.delete(n), m.done.delete(n));
    if ((n.f & S) !== 0)
      if (((n.f ^= S), n === s)) z(n, null, r);
      else {
        var d = o ? o.next : s;
        (n === a.effect.last && (a.effect.last = n.prev),
          n.prev && (n.prev.next = n.next),
          n.next && (n.next.prev = n.prev),
          N(a, o, n),
          N(a, n, d),
          z(n, d, r),
          (o = n),
          (c = []),
          (v = []),
          (s = L(o.next)));
        continue;
      }
    if (((n.f & D) !== 0 && aa(n), n !== s)) {
      if (u !== void 0 && u.has(n)) {
        if (c.length < v.length) {
          var h = v[0],
            _;
          o = h.prev;
          var y = c[0],
            T = c[c.length - 1];
          for (_ = 0; _ < c.length; _ += 1) z(c[_], h, r);
          for (_ = 0; _ < v.length; _ += 1) u.delete(v[_]);
          (N(a, y.prev, T.next),
            N(a, o, y),
            N(a, T, h),
            (s = h),
            (o = T),
            (g -= 1),
            (c = []),
            (v = []));
        } else
          (u.delete(n),
            z(n, s, r),
            N(a, n.prev, n.next),
            N(a, n, o === null ? a.effect.first : o.next),
            N(a, o, n),
            (o = n));
        continue;
      }
      for (c = [], v = []; s !== null && s !== n; )
        ((u ??= new Set()).add(s), v.push(s), (s = L(s.next)));
      if (s === null) continue;
    }
    ((n.f & S) === 0 && c.push(n), (o = n), (s = L(n.next)));
  }
  if (a.outrogroups !== null) {
    for (const m of a.outrogroups) m.pending.size === 0 && (K(V(m.done)), a.outrogroups?.delete(m));
    a.outrogroups.size === 0 && (a.outrogroups = null);
  }
  if (s !== null || u !== void 0) {
    var w = [];
    if (u !== void 0) for (n of u) (n.f & D) === 0 && w.push(n);
    for (; s !== null; ) ((s.f & D) === 0 && s !== a.fallback && w.push(s), (s = L(s.next)));
    var A = w.length;
    if (A > 0) {
      var H = i === 0 ? r : null;
      Ya(a, w, H);
    }
  }
}
function Ua(a, e, r, l, f, i, t, s) {
  var u = (t & ha) !== 0 ? ((t & _a) === 0 ? ga(r, !1, !1) : Q(r)) : null,
    o = (t & ma) !== 0 ? Q(f) : null;
  return {
    v: u,
    i: o,
    e: U(
      () => (
        i(e, u ?? r, o ?? f, s),
        () => {
          a.delete(l);
        }
      ),
    ),
  };
}
function z(a, e, r) {
  if (a.nodes)
    for (
      var l = a.nodes.start, f = a.nodes.end, i = e && (e.f & S) === 0 ? e.nodes.start : r;
      l !== null;
    ) {
      var t = Aa(l);
      if ((i.before(l), l === f)) return;
      l = t;
    }
}
function N(a, e, r) {
  (e === null ? (a.effect.first = r) : (e.next = r),
    r === null ? (a.effect.last = e) : (r.prev = e));
}
function Ka(a, e, ...r) {
  var l = new La(a);
  j(() => {
    const f = e() ?? null;
    l.ensure(f, f && ((i) => f(i, ...r)));
  }, Na);
}
const Va = Symbol("is custom element"),
  Xa = Symbol("is html"),
  Ga = wa ? "link" : "LINK";
function M(a, e, r, l) {
  var f = qa(a);
  (C &&
    ((f[e] = a.getAttribute(e)),
    e === "src" || e === "srcset" || (e === "href" && a.nodeName === Ga))) ||
    (f[e] !== (f[e] = r) &&
      (e === "loading" && (a[Sa] = r),
      r == null
        ? a.removeAttribute(e)
        : typeof r != "string" && Qa(a).includes(e)
          ? (a[e] = r)
          : a.setAttribute(e, r)));
}
function qa(a) {
  return (a.__attributes ??= { [Va]: a.nodeName.includes("-"), [Xa]: a.namespaceURI === ba });
}
var J = new Map();
function Qa(a) {
  var e = a.getAttribute("is") || a.nodeName,
    r = J.get(e);
  if (r) return r;
  J.set(e, (r = []));
  for (var l, f = a, i = Element.prototype; i !== f; ) {
    l = Ma(f);
    for (var t in l) l[t].set && r.push(t);
    f = Ia(f);
  }
  return r;
}
var Wa = $("<a> </a>"),
  Za = $(
    '<header class="yona-header" data-testid="yona-shell-header"><div class="yona-header-inner"><a class="yona-brand"><img class="yona-logo" alt="Yona"/> <span class="yona-wordmark">Yona</span></a> <nav class="yona-nav" aria-label="Primary"><a data-testid="yona-nav-projects">Projects</a> <a data-testid="yona-nav-organizations">Organizations</a> <a data-testid="yona-nav-help">Help</a> <a data-testid="yona-nav-login">Login</a></nav></div></header> <main class="yona-main"><!></main> <footer class="yona-footer" data-testid="yona-shell-footer"><div class="yona-footer-inner"><span>Powered by Yona</span> <span class="yona-footer-sep">|</span> <a class="yona-footer-link" href="https://github.com/yona-projects" target="_blank" rel="noreferrer">Project</a></div></footer> <div style="display:none"></div>',
    1,
  );
function ne(a, e) {
  Ca(e, !0);
  var r = Za(),
    l = ka(r),
    f = k(l),
    i = k(f),
    t = k(i);
  (Ra(2), I(i));
  var s = x(i, 2),
    u = k(s),
    o = x(u, 2),
    c = x(o, 2),
    v = x(c, 2);
  (I(s), I(f), I(l));
  var p = x(l, 2),
    b = k(p);
  (Ka(b, () => e.children), I(p));
  var n = x(p, 4);
  (Ba(
    n,
    21,
    () => za,
    Pa,
    (g, d) => {
      var h = Wa(),
        _ = k(h, !0);
      (I(h),
        W(
          (y) => {
            (M(h, "href", y), Ha(_, F(d)));
          },
          [() => R(Fa.url.pathname, { locale: F(d) })],
        ),
        X(g, h));
    },
  ),
    I(n),
    W(
      (g, d, h, _, y) => {
        (M(i, "href", g),
          M(t, "src", `${Oa}/images/yona_logo.png`),
          M(u, "href", d),
          M(o, "href", h),
          M(c, "href", _),
          M(v, "href", y));
      },
      [
        () => R("/"),
        () => R("/projects"),
        () => R("/organizations"),
        () => R("/help"),
        () => R("/login"),
      ],
    ),
    X(a, r),
    xa());
}
export { ne as component };
