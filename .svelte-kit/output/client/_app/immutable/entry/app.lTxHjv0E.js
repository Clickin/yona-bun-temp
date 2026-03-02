const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "../nodes/0.DTit13Uh.js",
      "../chunks/BtzawNjK.js",
      "../chunks/CYuLPLop.js",
      "../chunks/DVxR7C2P.js",
      "../chunks/DswxB6EI.js",
      "../chunks/BD3U-b1t.js",
      "../chunks/D8M4Cgha.js",
      "../chunks/6vG7ubTH.js",
      "../assets/0.BRMr9se_.css",
      "../nodes/1.BGNDreia.js",
      "../chunks/CMWHeIi6.js",
      "../nodes/2.NoH-WCMK.js",
      "../nodes/3.PB2HDMVE.js",
      "../nodes/4.n66HTiJ2.js",
      "../nodes/5.DQtq-Wzm.js",
      "../nodes/6.BYGuT81j.js",
    ]),
) => i.map((i) => d[i]);
import { B as Y, d as se } from "../chunks/DswxB6EI.js";
import {
  h as L,
  I as k,
  M as z,
  a8 as q,
  N as H,
  aB as F,
  O as ne,
  P as G,
  K,
  Q as w,
  f as Q,
  aG as ie,
  af as oe,
  j as W,
  ah as ue,
  aH as J,
  aI as ce,
  aJ as fe,
  aK as le,
  o as E,
  aL as de,
  aM as T,
  aN as _e,
  H as me,
  aO as ve,
  aP as he,
  C as ge,
  aQ as Ee,
  aR as Pe,
  t as be,
  Y as Re,
  aS as ye,
  aT as X,
  aU as Se,
  az as Oe,
  a1 as Te,
  v as Ae,
  u as Ie,
  i as Le,
  aV as we,
  w as A,
  B as De,
  y as xe,
  aW as D,
  z as Ne,
  A as je,
  x as Be,
  aX as x,
} from "../chunks/CYuLPLop.js";
import { h as Ce, m as Me, u as Ve, s as pe } from "../chunks/DVxR7C2P.js";
import { a as O, f as Z, c as N, t as Ue } from "../chunks/BtzawNjK.js";
import { o as Ye } from "../chunks/D8M4Cgha.js";
function j(r, e, n = !1) {
  var u;
  L && ((u = Q), k());
  var i = new Y(r),
    t = n ? q : 0;
  function a(s, d) {
    if (L) {
      var l = H(u),
        o;
      if ((l === F ? (o = 0) : l === ne ? (o = !1) : (o = parseInt(l.substring(1))), s !== o)) {
        var _ = G();
        (K(_), (i.anchor = _), w(!1), i.ensure(s, d), w(!0));
        return;
      }
    }
    i.ensure(s, d);
  }
  z(() => {
    var s = !1;
    (e((d, l = 0) => {
      ((s = !0), a(l, d));
    }),
      s || a(!1, null));
  }, t);
}
function B(r, e, n) {
  var u;
  L && ((u = Q), k());
  var i = new Y(r);
  z(() => {
    var t = e() ?? null;
    if (L) {
      var a = H(u),
        s = a === F,
        d = t !== null;
      if (s !== d) {
        var l = G();
        (K(l), (i.anchor = l), w(!1), i.ensure(t, t && ((o) => n(o, t))), w(!0));
        return;
      }
    }
    i.ensure(t, t && ((o) => n(o, t)));
  }, q);
}
function p(r, e) {
  return r === e || r?.[J] === e;
}
function C(r = {}, e, n, u) {
  return (
    ie(() => {
      var i, t;
      return (
        oe(() => {
          ((i = t),
            (t = []),
            W(() => {
              r !== n(...t) && (e(r, ...t), i && p(n(...i), r) && e(null, ...i));
            }));
        }),
        () => {
          ue(() => {
            t && p(n(...t), r) && e(null, ...t);
          });
        }
      );
    }),
    r
  );
}
let I = !1;
function ke(r) {
  var e = I;
  try {
    return ((I = !1), [r(), I]);
  } finally {
    I = e;
  }
}
function M(r, e, n, u) {
  var i = !ge || (n & Ee) !== 0,
    t = (n & he) !== 0,
    a = (n & ye) !== 0,
    s = u,
    d = !0,
    l = () => (d && ((d = !1), (s = a ? W(u) : u)), s),
    o;
  if (t) {
    var _ = J in r || X in r;
    o = ce(r, e)?.set ?? (_ && e in r ? (c) => (r[e] = c) : void 0);
  }
  var v,
    h = !1;
  (t ? ([v, h] = ke(() => r[e])) : (v = r[e]),
    v === void 0 && u !== void 0 && ((v = l()), o && (i && fe(), o(v))));
  var m;
  if (
    (i
      ? (m = () => {
          var c = r[e];
          return c === void 0 ? l() : ((d = !0), c);
        })
      : (m = () => {
          var c = r[e];
          return (c !== void 0 && (s = void 0), c === void 0 ? s : c);
        }),
    i && (n & le) === 0)
  )
    return m;
  if (o) {
    var f = r.$$legacy;
    return function (c, b) {
      return arguments.length > 0 ? ((!i || !b || f || h) && o(b ? m() : c), c) : m();
    };
  }
  var P = !1,
    g = ((n & Pe) !== 0 ? be : Re)(() => ((P = !1), m()));
  t && E(g);
  var y = me;
  return function (c, b) {
    if (arguments.length > 0) {
      const R = b ? E(g) : i && t ? de(c) : c;
      return (T(g, R), (P = !0), s !== void 0 && (s = R), c);
    }
    return (_e && P) || (y.f & ve) !== 0 ? g.v : E(g);
  };
}
function ze(r) {
  return class extends qe {
    constructor(e) {
      super({ component: r, ...e });
    }
  };
}
class qe {
  #t;
  #e;
  constructor(e) {
    var n = new Map(),
      u = (t, a) => {
        var s = Te(a, !1, !1);
        return (n.set(t, s), s);
      };
    const i = new Proxy(
      { ...(e.props || {}), $$events: {} },
      {
        get(t, a) {
          return E(n.get(a) ?? u(a, Reflect.get(t, a)));
        },
        has(t, a) {
          return a === X ? !0 : (E(n.get(a) ?? u(a, Reflect.get(t, a))), Reflect.has(t, a));
        },
        set(t, a, s) {
          return (T(n.get(a) ?? u(a, s), s), Reflect.set(t, a, s));
        },
      },
    );
    ((this.#e = (e.hydrate ? Ce : Me)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: i,
      context: e.context,
      intro: e.intro ?? !1,
      recover: e.recover,
      transformError: e.transformError,
    })),
      (!e?.props?.$$host || e.sync === !1) && Se(),
      (this.#t = i.$$events));
    for (const t of Object.keys(this.#e))
      t === "$set" ||
        t === "$destroy" ||
        t === "$on" ||
        Oe(this, t, {
          get() {
            return this.#e[t];
          },
          set(a) {
            this.#e[t] = a;
          },
          enumerable: !0,
        });
    ((this.#e.$set = (t) => {
      Object.assign(i, t);
    }),
      (this.#e.$destroy = () => {
        Ve(this.#e);
      }));
  }
  $set(e) {
    this.#e.$set(e);
  }
  $on(e, n) {
    this.#t[e] = this.#t[e] || [];
    const u = (...i) => n.call(this, ...i);
    return (
      this.#t[e].push(u),
      () => {
        this.#t[e] = this.#t[e].filter((i) => i !== u);
      }
    );
  }
  $destroy() {
    this.#e.$destroy();
  }
}
const He = "modulepreload",
  Fe = function (r, e) {
    return new URL(r, e).href;
  },
  U = {},
  S = function (e, n, u) {
    let i = Promise.resolve();
    if (n && n.length > 0) {
      let l = function (o) {
        return Promise.all(
          o.map((_) =>
            Promise.resolve(_).then(
              (v) => ({ status: "fulfilled", value: v }),
              (v) => ({ status: "rejected", reason: v }),
            ),
          ),
        );
      };
      const a = document.getElementsByTagName("link"),
        s = document.querySelector("meta[property=csp-nonce]"),
        d = s?.nonce || s?.getAttribute("nonce");
      i = l(
        n.map((o) => {
          if (((o = Fe(o, u)), o in U)) return;
          U[o] = !0;
          const _ = o.endsWith(".css"),
            v = _ ? '[rel="stylesheet"]' : "";
          if (u)
            for (let m = a.length - 1; m >= 0; m--) {
              const f = a[m];
              if (f.href === o && (!_ || f.rel === "stylesheet")) return;
            }
          else if (document.querySelector(`link[href="${o}"]${v}`)) return;
          const h = document.createElement("link");
          if (
            ((h.rel = _ ? "stylesheet" : He),
            _ || (h.as = "script"),
            (h.crossOrigin = ""),
            (h.href = o),
            d && h.setAttribute("nonce", d),
            document.head.appendChild(h),
            _)
          )
            return new Promise((m, f) => {
              (h.addEventListener("load", m),
                h.addEventListener("error", () => f(new Error(`Unable to preload CSS for ${o}`))));
            });
        }),
      );
    }
    function t(a) {
      const s = new Event("vite:preloadError", { cancelable: !0 });
      if (((s.payload = a), window.dispatchEvent(s), !s.defaultPrevented)) throw a;
    }
    return i.then((a) => {
      for (const s of a || []) s.status === "rejected" && t(s.reason);
      return e().catch(t);
    });
  },
  Ge = (r) => se(r.url).pathname,
  at = {};
var Ke = Z(
    '<div id="svelte-announcer" aria-live="assertive" aria-atomic="true" style="position: absolute; left: 0; top: 0; clip: rect(0 0 0 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; width: 1px; height: 1px"><!></div>',
  ),
  Qe = Z("<!> <!>", 1);
function We(r, e) {
  Ae(e, !0);
  let n = M(e, "components", 23, () => []),
    u = M(e, "data_0", 3, null),
    i = M(e, "data_1", 3, null);
  (Ie(() => e.stores.page.set(e.page)),
    Le(() => {
      (e.stores, e.page, e.constructors, n(), e.form, u(), i(), e.stores.page.notify());
    }));
  let t = D(!1),
    a = D(!1),
    s = D(null);
  Ye(() => {
    const f = e.stores.page.subscribe(() => {
      E(t) &&
        (T(a, !0),
        we().then(() => {
          T(s, document.title || "untitled page", !0);
        }));
    });
    return (T(t, !0), f);
  });
  const d = x(() => e.constructors[1]);
  var l = Qe(),
    o = A(l);
  {
    var _ = (f) => {
        const P = x(() => e.constructors[0]);
        var g = N(),
          y = A(g);
        (B(
          y,
          () => E(P),
          (c, b) => {
            C(
              b(c, {
                get data() {
                  return u();
                },
                get form() {
                  return e.form;
                },
                get params() {
                  return e.page.params;
                },
                children: (R, Xe) => {
                  var V = N(),
                    ee = A(V);
                  (B(
                    ee,
                    () => E(d),
                    (te, re) => {
                      C(
                        re(te, {
                          get data() {
                            return i();
                          },
                          get form() {
                            return e.form;
                          },
                          get params() {
                            return e.page.params;
                          },
                        }),
                        (ae) => (n()[1] = ae),
                        () => n()?.[1],
                      );
                    },
                  ),
                    O(R, V));
                },
                $$slots: { default: !0 },
              }),
              (R) => (n()[0] = R),
              () => n()?.[0],
            );
          },
        ),
          O(f, g));
      },
      v = (f) => {
        const P = x(() => e.constructors[0]);
        var g = N(),
          y = A(g);
        (B(
          y,
          () => E(P),
          (c, b) => {
            C(
              b(c, {
                get data() {
                  return u();
                },
                get form() {
                  return e.form;
                },
                get params() {
                  return e.page.params;
                },
              }),
              (R) => (n()[0] = R),
              () => n()?.[0],
            );
          },
        ),
          O(f, g));
      };
    j(o, (f) => {
      e.constructors[1] ? f(_) : f(v, !1);
    });
  }
  var h = De(o, 2);
  {
    var m = (f) => {
      var P = Ke(),
        g = Ne(P);
      {
        var y = (c) => {
          var b = Ue();
          (Be(() => pe(b, E(s))), O(c, b));
        };
        j(g, (c) => {
          E(a) && c(y);
        });
      }
      (je(P), O(f, P));
    };
    j(h, (f) => {
      E(t) && f(m);
    });
  }
  (O(r, l), xe());
}
const st = ze(We),
  nt = [
    () =>
      S(
        () => import("../nodes/0.DTit13Uh.js"),
        __vite__mapDeps([0, 1, 2, 3, 4, 5, 6, 7, 8]),
        import.meta.url,
      ),
    () =>
      S(
        () => import("../nodes/1.BGNDreia.js"),
        __vite__mapDeps([9, 1, 2, 10, 3, 7, 5, 6]),
        import.meta.url,
      ),
    () =>
      S(() => import("../nodes/2.NoH-WCMK.js"), __vite__mapDeps([11, 1, 2, 10]), import.meta.url),
    () =>
      S(() => import("../nodes/3.PB2HDMVE.js"), __vite__mapDeps([12, 1, 2, 10]), import.meta.url),
    () =>
      S(() => import("../nodes/4.n66HTiJ2.js"), __vite__mapDeps([13, 1, 2, 10]), import.meta.url),
    () =>
      S(() => import("../nodes/5.DQtq-Wzm.js"), __vite__mapDeps([14, 1, 2, 10]), import.meta.url),
    () =>
      S(() => import("../nodes/6.BYGuT81j.js"), __vite__mapDeps([15, 1, 2, 10]), import.meta.url),
  ],
  it = [],
  ot = { "/": [2], "/help": [3], "/login": [4], "/organizations": [5], "/projects": [6] },
  $ = {
    handleError: ({ error: r }) => {
      console.error(r);
    },
    reroute: Ge || (() => {}),
    transport: {},
  },
  Je = Object.fromEntries(Object.entries($.transport).map(([r, e]) => [r, e.decode])),
  ut = Object.fromEntries(Object.entries($.transport).map(([r, e]) => [r, e.encode])),
  ct = !1,
  ft = (r, e) => Je[r](e);
export {
  ft as decode,
  Je as decoders,
  ot as dictionary,
  ut as encoders,
  ct as hash,
  $ as hooks,
  at as matchers,
  nt as nodes,
  st as root,
  it as server_loads,
};
