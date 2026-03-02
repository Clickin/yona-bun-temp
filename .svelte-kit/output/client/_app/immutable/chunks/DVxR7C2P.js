import {
  ae as ee,
  o as U,
  af as te,
  a2 as J,
  j as re,
  ag as H,
  ah as D,
  f as g,
  h as v,
  H as b,
  ai as P,
  M as se,
  I as ie,
  O as ne,
  aj as V,
  b as p,
  c as K,
  ak as k,
  p as I,
  m as ae,
  al as j,
  am as fe,
  an as q,
  ao as oe,
  ap as he,
  aq as A,
  ar as N,
  as as L,
  at as le,
  au as Q,
  g as G,
  V as de,
  d as x,
  K as O,
  n as ce,
  P as _e,
  av as T,
  a8 as ue,
  aw as pe,
  ax as ge,
  ay as ve,
  az as ye,
  aA as Y,
  E as me,
  S as X,
  aB as be,
  a7 as Ee,
  aC as M,
  Q as w,
  aD as Te,
  a6 as we,
  aE as Se,
  _ as Re,
  v as De,
  U as Ae,
  aF as Ne,
  y as Oe,
} from "./CYuLPLop.js";
import { b as Fe } from "./BtzawNjK.js";
function ke(s) {
  let e = 0,
    r = J(0),
    i;
  return () => {
    ee() &&
      (U(r),
      te(
        () => (
          e === 0 && (i = re(() => s(() => H(r)))),
          (e += 1),
          () => {
            D(() => {
              ((e -= 1), e === 0 && (i?.(), (i = void 0), H(r)));
            });
          }
        ),
      ));
  };
}
var Ie = ue | pe;
function xe(s, e, r, i) {
  new Ye(s, e, r, i);
}
class Ye {
  parent;
  is_pending = !1;
  transform_error;
  #t;
  #g = v ? g : null;
  #i;
  #h;
  #e;
  #n = null;
  #r = null;
  #s = null;
  #a = null;
  #l = 0;
  #o = 0;
  #d = !1;
  #c = new Set();
  #_ = new Set();
  #f = null;
  #m = ke(
    () => (
      (this.#f = J(this.#l)),
      () => {
        this.#f = null;
      }
    ),
  );
  constructor(e, r, i, f) {
    ((this.#t = e),
      (this.#i = r),
      (this.#h = (t) => {
        var n = b;
        ((n.b = this), (n.f |= P), i(t));
      }),
      (this.parent = b.b),
      (this.transform_error = f ?? this.parent?.transform_error ?? ((t) => t)),
      (this.#e = se(() => {
        if (v) {
          const t = this.#g;
          ie();
          const n = t.data === ne;
          if (t.data.startsWith(V)) {
            const a = JSON.parse(t.data.slice(V.length));
            this.#E(a);
          } else n ? this.#T() : this.#b();
        } else this.#v();
      }, Ie)),
      v && (this.#t = g));
  }
  #b() {
    try {
      this.#n = p(() => this.#h(this.#t));
    } catch (e) {
      this.error(e);
    }
  }
  #E(e) {
    const r = this.#i.failed;
    r &&
      (this.#s = p(() => {
        r(
          this.#t,
          () => e,
          () => () => {},
        );
      }));
  }
  #T() {
    const e = this.#i.pending;
    e &&
      ((this.is_pending = !0),
      (this.#r = p(() => e(this.#t))),
      D(() => {
        var r = (this.#a = document.createDocumentFragment()),
          i = K();
        (r.append(i),
          (this.#n = this.#p(() => (k.ensure(), p(() => this.#h(i))))),
          this.#o === 0 &&
            (this.#t.before(r),
            (this.#a = null),
            I(this.#r, () => {
              this.#r = null;
            }),
            this.#u()));
      }));
  }
  #v() {
    try {
      if (
        ((this.is_pending = this.has_pending_snippet()),
        (this.#o = 0),
        (this.#l = 0),
        (this.#n = p(() => {
          this.#h(this.#t);
        })),
        this.#o > 0)
      ) {
        var e = (this.#a = document.createDocumentFragment());
        ae(this.#n, e);
        const r = this.#i.pending;
        this.#r = p(() => r(this.#t));
      } else this.#u();
    } catch (r) {
      this.error(r);
    }
  }
  #u() {
    this.is_pending = !1;
    for (const e of this.#c) (j(e, fe), q(e));
    for (const e of this.#_) (j(e, oe), q(e));
    (this.#c.clear(), this.#_.clear());
  }
  defer_effect(e) {
    he(e, this.#c, this.#_);
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#i.pending;
  }
  #p(e) {
    var r = b,
      i = Q,
      f = G;
    (A(this.#e), N(this.#e), L(this.#e.ctx));
    try {
      return e();
    } catch (t) {
      return (le(t), null);
    } finally {
      (A(r), N(i), L(f));
    }
  }
  #y(e) {
    if (!this.has_pending_snippet()) {
      this.parent && this.parent.#y(e);
      return;
    }
    ((this.#o += e),
      this.#o === 0 &&
        (this.#u(),
        this.#r &&
          I(this.#r, () => {
            this.#r = null;
          }),
        this.#a && (this.#t.before(this.#a), (this.#a = null))));
  }
  update_pending_count(e) {
    (this.#y(e),
      (this.#l += e),
      !(!this.#f || this.#d) &&
        ((this.#d = !0),
        D(() => {
          ((this.#d = !1), this.#f && de(this.#f, this.#l));
        })));
  }
  get_effect_pending() {
    return (this.#m(), U(this.#f));
  }
  error(e) {
    var r = this.#i.onerror;
    let i = this.#i.failed;
    if (!r && !i) throw e;
    (this.#n && (x(this.#n), (this.#n = null)),
      this.#r && (x(this.#r), (this.#r = null)),
      this.#s && (x(this.#s), (this.#s = null)),
      v && (O(this.#g), ce(), O(_e())));
    var f = !1,
      t = !1;
    const n = () => {
        if (f) {
          ve();
          return;
        }
        ((f = !0),
          t && ge(),
          this.#s !== null &&
            I(this.#s, () => {
              this.#s = null;
            }),
          this.#p(() => {
            (k.ensure(), this.#v());
          }));
      },
      c = (a) => {
        try {
          ((t = !0), r?.(a, n), (t = !1));
        } catch (o) {
          T(o, this.#e && this.#e.parent);
        }
        i &&
          (this.#s = this.#p(() => {
            k.ensure();
            try {
              return p(() => {
                var o = b;
                ((o.b = this),
                  (o.f |= P),
                  i(
                    this.#t,
                    () => a,
                    () => n,
                  ));
              });
            } catch (o) {
              return (T(o, this.#e.parent), null);
            }
          }));
      };
    D(() => {
      var a;
      try {
        a = this.transform_error(e);
      } catch (o) {
        T(o, this.#e && this.#e.parent);
        return;
      }
      a !== null && typeof a == "object" && typeof a.then == "function"
        ? a.then(c, (o) => T(o, this.#e && this.#e.parent))
        : c(a);
    });
  }
}
const Me = ["touchstart", "touchmove"];
function Ce(s) {
  return Me.includes(s);
}
const S = Symbol("events"),
  Be = new Set(),
  $ = new Set();
let z = null;
function W(s) {
  var e = this,
    r = e.ownerDocument,
    i = s.type,
    f = s.composedPath?.() || [],
    t = f[0] || s.target;
  z = s;
  var n = 0,
    c = z === s && s[S];
  if (c) {
    var a = f.indexOf(c);
    if (a !== -1 && (e === document || e === window)) {
      s[S] = e;
      return;
    }
    var o = f.indexOf(e);
    if (o === -1) return;
    a <= o && (n = a);
  }
  if (((t = f[n] || s.target), t !== e)) {
    ye(s, "currentTarget", {
      configurable: !0,
      get() {
        return t || r;
      },
    });
    var y = Q,
      E = b;
    (N(null), A(null));
    try {
      for (var u, l = []; t !== null; ) {
        var h = t.assignedSlot || t.parentNode || t.host || null;
        try {
          var d = t[S]?.[i];
          d != null && (!t.disabled || s.target === t) && d.call(t, s);
        } catch (_) {
          u ? l.push(_) : (u = _);
        }
        if (s.cancelBubble || h === e || h === null) break;
        t = h;
      }
      if (u) {
        for (let _ of l)
          queueMicrotask(() => {
            throw _;
          });
        throw u;
      }
    } finally {
      ((s[S] = e), delete s.currentTarget, N(y), A(E));
    }
  }
}
function je(s, e) {
  var r = e == null ? "" : typeof e == "object" ? `${e}` : e;
  r !== (s.__t ??= s.nodeValue) && ((s.__t = r), (s.nodeValue = `${r}`));
}
function He(s, e) {
  return Z(s, e);
}
function qe(s, e) {
  (Y(), (e.intro = e.intro ?? !1));
  const r = e.target,
    i = v,
    f = g;
  try {
    for (var t = me(r); t && (t.nodeType !== X || t.data !== be); ) t = Ee(t);
    if (!t) throw M;
    (w(!0), O(t));
    const n = Z(s, { ...e, anchor: t });
    return (w(!1), n);
  } catch (n) {
    if (
      n instanceof Error &&
      n.message
        .split(`
`)
        .some((c) => c.startsWith("https://svelte.dev/e/"))
    )
      throw n;
    return (
      n !== M && console.warn("Failed to hydrate: ", n),
      e.recover === !1 && Te(),
      Y(),
      we(r),
      w(!1),
      He(s, e)
    );
  } finally {
    (w(i), O(f));
  }
}
const R = new Map();
function Z(
  s,
  { target: e, anchor: r, props: i = {}, events: f, context: t, intro: n = !0, transformError: c },
) {
  Y();
  var a = void 0,
    o = Se(() => {
      var y = r ?? e.appendChild(K());
      xe(
        y,
        { pending: () => {} },
        (l) => {
          De({});
          var h = G;
          if (
            (t && (h.c = t),
            f && (i.$$events = f),
            v && Fe(l, null),
            (a = s(l, i) || {}),
            v && ((b.nodes.end = g), g === null || g.nodeType !== X || g.data !== Ae))
          )
            throw (Ne(), M);
          Oe();
        },
        c,
      );
      var E = new Set(),
        u = (l) => {
          for (var h = 0; h < l.length; h++) {
            var d = l[h];
            if (!E.has(d)) {
              E.add(d);
              var _ = Ce(d);
              for (const F of [e, document]) {
                var m = R.get(F);
                m === void 0 && ((m = new Map()), R.set(F, m));
                var B = m.get(d);
                B === void 0
                  ? (F.addEventListener(d, W, { passive: _ }), m.set(d, 1))
                  : m.set(d, B + 1);
              }
            }
          }
        };
      return (
        u(Re(Be)),
        $.add(u),
        () => {
          for (var l of E)
            for (const _ of [e, document]) {
              var h = R.get(_),
                d = h.get(l);
              --d == 0
                ? (_.removeEventListener(l, W), h.delete(l), h.size === 0 && R.delete(_))
                : h.set(l, d);
            }
          ($.delete(u), y !== r && y.parentNode?.removeChild(y));
        }
      );
    });
  return (C.set(a, o), a);
}
let C = new WeakMap();
function Le(s, e) {
  const r = C.get(s);
  return r ? (C.delete(s), r(e)) : Promise.resolve();
}
export { qe as h, He as m, je as s, Le as u };
