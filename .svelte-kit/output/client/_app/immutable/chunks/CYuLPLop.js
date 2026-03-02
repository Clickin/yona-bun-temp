var Mt = Array.isArray,
  jt = Array.prototype.indexOf,
  re = Array.prototype.includes,
  On = Array.from,
  Nn = Object.defineProperty,
  de = Object.getOwnPropertyDescriptor,
  Lt = Object.getOwnPropertyDescriptors,
  Yt = Object.prototype,
  qt = Array.prototype,
  nt = Object.getPrototypeOf,
  Ze = Object.isExtensible;
const Ht = () => {};
function Dn(e) {
  return e();
}
function Vt(e) {
  for (var t = 0; t < e.length; t++) e[t]();
}
function rt() {
  var e,
    t,
    n = new Promise((r, s) => {
      ((e = r), (t = s));
    });
  return { promise: n, resolve: e, reject: t };
}
const g = 2,
  oe = 4,
  se = 8,
  st = 1 << 24,
  G = 16,
  M = 32,
  ne = 64,
  Ut = 128,
  O = 512,
  y = 1024,
  T = 2048,
  F = 4096,
  C = 8192,
  H = 16384,
  ue = 32768,
  Te = 65536,
  $e = 1 << 17,
  Bt = 1 << 18,
  ye = 1 << 19,
  ft = 1 << 20,
  In = 1 << 25,
  J = 65536,
  Ie = 1 << 21,
  Le = 1 << 22,
  V = 1 << 23,
  he = Symbol("$state"),
  Pn = Symbol("legacy props"),
  Cn = Symbol(""),
  X = new (class extends Error {
    name = "StaleReactionError";
    message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
  })(),
  Mn = !!globalThis.document?.contentType && globalThis.document.contentType.includes("xml"),
  xe = 3,
  it = 8;
function Gt() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function jn(e, t, n) {
  throw new Error("https://svelte.dev/e/each_key_duplicate");
}
function zt(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function Kt() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Xt(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function Zt() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Ln() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function Yn(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function $t() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function Wt() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function Jt() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function qn() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
const Hn = 1,
  Vn = 2,
  Un = 16,
  Bn = 1,
  Gn = 2,
  zn = 4,
  Kn = 8,
  Xn = 16,
  Zn = 1,
  $n = 2,
  Qt = "[",
  en = "[!",
  Wn = "[?",
  tn = "]",
  Ye = {},
  E = Symbol(),
  nn = "http://www.w3.org/1999/xhtml";
function qe(e) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
function Jn() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
let Q = !1;
function Qn(e) {
  Q = e;
}
let S;
function fe(e) {
  if (e === null) throw (qe(), Ye);
  return (S = e);
}
function er() {
  return fe(z(S));
}
function tr(e) {
  if (Q) {
    if (z(S) !== null) throw (qe(), Ye);
    S = e;
  }
}
function nr(e = 1) {
  if (Q) {
    for (var t = e, n = S; t--; ) n = z(n);
    S = n;
  }
}
function rr(e = !0) {
  for (var t = 0, n = S; ; ) {
    if (n.nodeType === it) {
      var r = n.data;
      if (r === tn) {
        if (t === 0) return n;
        t -= 1;
      } else (r === Qt || r === en || (r[0] === "[" && !isNaN(Number(r.slice(1))))) && (t += 1);
    }
    var s = z(n);
    (e && n.remove(), (n = s));
  }
}
function sr(e) {
  if (!e || e.nodeType !== it) throw (qe(), Ye);
  return e.data;
}
function at(e) {
  return e === this.v;
}
function rn(e, t) {
  return e != e
    ? t == t
    : e !== t || (e !== null && typeof e == "object") || typeof e == "function";
}
function lt(e) {
  return !rn(e, this.v);
}
let ke = !1;
function fr() {
  ke = !0;
}
let b = null;
function Ae(e) {
  b = e;
}
function ir(e, t = !1, n) {
  b = {
    p: b,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    l: ke && !t ? { s: null, u: null, $: [] } : null,
  };
}
function ar(e) {
  var t = b,
    n = t.e;
  if (n !== null) {
    t.e = null;
    for (var r of n) At(r);
  }
  return ((t.i = !0), (b = t.p), {});
}
function Ee() {
  return !ke || (b !== null && b.l === null);
}
let Z = [];
function ot() {
  var e = Z;
  ((Z = []), Vt(e));
}
function We(e) {
  if (Z.length === 0 && !pe) {
    var t = Z;
    queueMicrotask(() => {
      t === Z && ot();
    });
  }
  Z.push(e);
}
function sn() {
  for (; Z.length > 0; ) ot();
}
function fn(e) {
  var t = d;
  if (t === null) return ((v.f |= V), e);
  if ((t.f & ue) === 0 && (t.f & oe) === 0) throw e;
  Re(e, t);
}
function Re(e, t) {
  for (; t !== null; ) {
    if ((t.f & Ut) !== 0) {
      if ((t.f & ue) === 0) throw e;
      try {
        t.b.error(e);
        return;
      } catch (n) {
        e = n;
      }
    }
    t = t.parent;
  }
  throw e;
}
const an = -7169;
function w(e, t) {
  e.f = (e.f & an) | t;
}
function He(e) {
  (e.f & O) !== 0 || e.deps === null ? w(e, y) : w(e, F);
}
function ut(e) {
  if (e !== null) for (const t of e) (t.f & g) === 0 || (t.f & J) === 0 || ((t.f ^= J), ut(t.deps));
}
function ln(e, t, n) {
  ((e.f & T) !== 0 ? t.add(e) : (e.f & F) !== 0 && n.add(e), ut(e.deps), w(e, y));
}
const me = new Set();
let p = null,
  I = null,
  A = [],
  Oe = null,
  pe = !1,
  ie = null;
class ce {
  current = new Map();
  previous = new Map();
  #t = new Set();
  #s = new Set();
  #r = 0;
  #f = 0;
  #i = null;
  #a = new Set();
  #n = new Set();
  #e = new Map();
  is_fork = !1;
  #l = !1;
  #o() {
    return this.is_fork || this.#f > 0;
  }
  skip_effect(t) {
    this.#e.has(t) || this.#e.set(t, { d: [], m: [] });
  }
  unskip_effect(t) {
    var n = this.#e.get(t);
    if (n) {
      this.#e.delete(t);
      for (var r of n.d) (w(r, T), Y(r));
      for (r of n.m) (w(r, F), Y(r));
    }
  }
  process(t) {
    ((A = []), this.apply());
    var n = (ie = []),
      r = [];
    for (const s of t) this.#u(s, n, r);
    if (((ie = null), this.#o())) {
      (this.#c(r), this.#c(n));
      for (const [s, f] of this.#e) dt(s, f);
    } else {
      p = null;
      for (const s of this.#t) s(this);
      (this.#t.clear(),
        this.#r === 0 && this.#_(),
        Je(r),
        Je(n),
        this.#a.clear(),
        this.#n.clear(),
        this.#i?.resolve());
    }
    I = null;
  }
  #u(t, n, r) {
    t.f ^= y;
    for (var s = t.first; s !== null; ) {
      var f = s.f,
        l = (f & (M | ne)) !== 0,
        o = l && (f & y) !== 0,
        i = o || (f & C) !== 0 || this.#e.has(s);
      if (!i && s.fn !== null) {
        l
          ? (s.f ^= y)
          : (f & oe) !== 0
            ? n.push(s)
            : ge(s) && ((f & G) !== 0 && this.#n.add(s), le(s));
        var a = s.first;
        if (a !== null) {
          s = a;
          continue;
        }
      }
      for (; s !== null; ) {
        var u = s.next;
        if (u !== null) {
          s = u;
          break;
        }
        s = s.parent;
      }
    }
  }
  #c(t) {
    for (var n = 0; n < t.length; n += 1) ln(t[n], this.#a, this.#n);
  }
  capture(t, n) {
    (n !== E && !this.previous.has(t) && this.previous.set(t, n),
      (t.f & V) === 0 && (this.current.set(t, t.v), I?.set(t, t.v)));
  }
  activate() {
    ((p = this), this.apply());
  }
  deactivate() {
    p === this && ((p = null), (I = null));
  }
  flush() {
    if (A.length > 0) ((p = this), ct());
    else if (this.#r === 0 && !this.is_fork) {
      for (const t of this.#t) t(this);
      (this.#t.clear(), this.#_(), this.#i?.resolve());
    }
    this.deactivate();
  }
  discard() {
    for (const t of this.#s) t(this);
    this.#s.clear();
  }
  #_() {
    if (me.size > 1) {
      this.previous.clear();
      var t = p,
        n = I,
        r = !0;
      for (const f of me) {
        if (f === this) {
          r = !1;
          continue;
        }
        const l = [];
        for (const [i, a] of this.current) {
          if (f.current.has(i))
            if (r && a !== f.current.get(i)) f.current.set(i, a);
            else continue;
          l.push(i);
        }
        if (l.length === 0) continue;
        const o = [...f.current.keys()].filter((i) => !this.current.has(i));
        if (o.length > 0) {
          var s = A;
          A = [];
          const i = new Set(),
            a = new Map();
          for (const u of l) _t(u, o, i, a);
          if (A.length > 0) {
            ((p = f), f.apply());
            for (const u of A) f.#u(u, [], []);
            f.deactivate();
          }
          A = s;
        }
      }
      ((p = t), (I = n));
    }
    (this.#e.clear(), me.delete(this));
  }
  increment(t) {
    ((this.#r += 1), t && (this.#f += 1));
  }
  decrement(t) {
    ((this.#r -= 1),
      t && (this.#f -= 1),
      !this.#l &&
        ((this.#l = !0),
        We(() => {
          ((this.#l = !1), this.#o() ? A.length > 0 && this.flush() : this.revive());
        })));
  }
  revive() {
    for (const t of this.#a) (this.#n.delete(t), w(t, T), Y(t));
    for (const t of this.#n) (w(t, F), Y(t));
    this.flush();
  }
  oncommit(t) {
    this.#t.add(t);
  }
  ondiscard(t) {
    this.#s.add(t);
  }
  settled() {
    return (this.#i ??= rt()).promise;
  }
  static ensure() {
    if (p === null) {
      const t = (p = new ce());
      (me.add(p),
        pe ||
          We(() => {
            p === t && t.flush();
          }));
    }
    return p;
  }
  apply() {}
}
function on(e) {
  var t = pe;
  pe = !0;
  try {
    for (var n; ; ) {
      if ((sn(), A.length === 0 && (p?.flush(), A.length === 0))) return ((Oe = null), n);
      ct();
    }
  } finally {
    pe = t;
  }
}
function ct() {
  var e = null;
  try {
    for (var t = 0; A.length > 0; ) {
      var n = ce.ensure();
      if (t++ > 1e3) {
        var r, s;
        un();
      }
      (n.process(A), U.clear());
    }
  } finally {
    ((A = []), (Oe = null), (ie = null));
  }
}
function un() {
  try {
    Zt();
  } catch (e) {
    Re(e, Oe);
  }
}
let L = null;
function Je(e) {
  var t = e.length;
  if (t !== 0) {
    for (var n = 0; n < t; ) {
      var r = e[n++];
      if (
        (r.f & (H | C)) === 0 &&
        ge(r) &&
        ((L = new Set()),
        le(r),
        r.deps === null &&
          r.first === null &&
          r.nodes === null &&
          r.teardown === null &&
          r.ac === null &&
          St(r),
        L?.size > 0)
      ) {
        U.clear();
        for (const s of L) {
          if ((s.f & (H | C)) !== 0) continue;
          const f = [s];
          let l = s.parent;
          for (; l !== null; ) (L.has(l) && (L.delete(l), f.push(l)), (l = l.parent));
          for (let o = f.length - 1; o >= 0; o--) {
            const i = f[o];
            (i.f & (H | C)) === 0 && le(i);
          }
        }
        L.clear();
      }
    }
    L = null;
  }
}
function _t(e, t, n, r) {
  if (!n.has(e) && (n.add(e), e.reactions !== null))
    for (const s of e.reactions) {
      const f = s.f;
      (f & g) !== 0
        ? _t(s, t, n, r)
        : (f & (Le | G)) !== 0 && (f & T) === 0 && vt(s, t, r) && (w(s, T), Y(s));
    }
}
function vt(e, t, n) {
  const r = n.get(e);
  if (r !== void 0) return r;
  if (e.deps !== null)
    for (const s of e.deps) {
      if (re.call(t, s)) return !0;
      if ((s.f & g) !== 0 && vt(s, t, n)) return (n.set(s, !0), !0);
    }
  return (n.set(e, !1), !1);
}
function Y(e) {
  var t = (Oe = e),
    n = t.b;
  if (n?.is_pending && (e.f & (oe | se | st)) !== 0 && (e.f & ue) === 0) {
    n.defer_effect(e);
    return;
  }
  for (; t.parent !== null; ) {
    t = t.parent;
    var r = t.f;
    if (ie !== null && t === d && (e.f & se) === 0) return;
    if ((r & (ne | M)) !== 0) {
      if ((r & y) === 0) return;
      t.f ^= y;
    }
  }
  A.push(t);
}
function dt(e, t) {
  if (!((e.f & M) !== 0 && (e.f & y) !== 0)) {
    ((e.f & T) !== 0 ? t.d.push(e) : (e.f & F) !== 0 && t.m.push(e), w(e, y));
    for (var n = e.first; n !== null; ) (dt(n, t), (n = n.next));
  }
}
function cn(e, t, n, r) {
  const s = Ee() ? Ve : hn;
  var f = e.filter((c) => !c.settled);
  if (n.length === 0 && f.length === 0) {
    r(t.map(s));
    return;
  }
  var l = d,
    o = _n(),
    i = f.length === 1 ? f[0].promise : f.length > 1 ? Promise.all(f.map((c) => c.promise)) : null;
  function a(c) {
    o();
    try {
      r(c);
    } catch (_) {
      (l.f & H) === 0 && Re(_, l);
    }
    Pe();
  }
  if (n.length === 0) {
    i.then(() => a(t.map(s)));
    return;
  }
  function u() {
    (o(),
      Promise.all(n.map((c) => dn(c)))
        .then((c) => a([...t.map(s), ...c]))
        .catch((c) => Re(c, l)));
  }
  i ? i.then(u) : u();
}
function _n() {
  var e = d,
    t = v,
    n = b,
    r = p;
  return function (f = !0) {
    (ae(e), B(t), Ae(n), f && r?.activate());
  };
}
function Pe(e = !0) {
  (ae(null), B(null), Ae(null), e && p?.deactivate());
}
function vn() {
  var e = d.b,
    t = p,
    n = e.is_rendered();
  return (
    e.update_pending_count(1),
    t.increment(n),
    () => {
      (e.update_pending_count(-1), t.decrement(n));
    }
  );
}
function Ve(e) {
  var t = g | T,
    n = v !== null && (v.f & g) !== 0 ? v : null;
  return (
    d !== null && (d.f |= ye),
    {
      ctx: b,
      deps: null,
      effects: null,
      equals: at,
      f: t,
      fn: e,
      reactions: null,
      rv: 0,
      v: E,
      wv: 0,
      parent: n ?? d,
      ac: null,
    }
  );
}
function dn(e, t, n) {
  d === null && Gt();
  var s = void 0,
    f = Be(E),
    l = !v,
    o = new Map();
  return (
    Tn(() => {
      var i = rt();
      s = i.promise;
      try {
        Promise.resolve(e()).then(i.resolve, i.reject).finally(Pe);
      } catch (_) {
        (i.reject(_), Pe());
      }
      var a = p;
      if (l) {
        var u = vn();
        (o.get(a)?.reject(X), o.delete(a), o.set(a, i));
      }
      const c = (_, m = void 0) => {
        if ((a.activate(), m)) m !== X && ((f.f |= V), Fe(f, m));
        else {
          ((f.f & V) !== 0 && (f.f ^= V), Fe(f, _));
          for (const [h, D] of o) {
            if ((o.delete(h), h === a)) break;
            D.reject(X);
          }
        }
        u && u();
      };
      i.promise.then(c, (_) => c(null, _ || "unknown"));
    }),
    bn(() => {
      for (const i of o.values()) i.reject(X);
    }),
    new Promise((i) => {
      function a(u) {
        function c() {
          u === s ? i(f) : a(s);
        }
        u.then(c, c);
      }
      a(s);
    })
  );
}
function lr(e) {
  const t = Ve(e);
  return (Ot(t), t);
}
function hn(e) {
  const t = Ve(e);
  return ((t.equals = lt), t);
}
function pn(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var n = 0; n < t.length; n += 1) ee(t[n]);
  }
}
function wn(e) {
  for (var t = e.parent; t !== null; ) {
    if ((t.f & g) === 0) return (t.f & H) === 0 ? t : null;
    t = t.parent;
  }
  return null;
}
function Ue(e) {
  var t,
    n = d;
  ae(wn(e));
  try {
    ((e.f &= ~J), pn(e), (t = Pt(e)));
  } finally {
    ae(n);
  }
  return t;
}
function ht(e) {
  var t = Ue(e);
  if (
    !e.equals(t) &&
    ((e.wv = Dt()), (!p?.is_fork || e.deps === null) && ((e.v = t), e.deps === null))
  ) {
    w(e, y);
    return;
  }
  te || (I !== null ? (Tt() || p?.is_fork) && I.set(e, t) : He(e));
}
function yn(e) {
  if (e.effects !== null)
    for (const t of e.effects)
      (t.teardown || t.ac) &&
        (t.teardown?.(), t.ac?.abort(X), (t.teardown = Ht), (t.ac = null), we(t, 0), ze(t));
}
function pt(e) {
  if (e.effects !== null) for (const t of e.effects) t.teardown && le(t);
}
let Ce = new Set();
const U = new Map();
let wt = !1;
function Be(e, t) {
  var n = { f: 0, v: e, reactions: null, equals: at, rv: 0, wv: 0 };
  return n;
}
function q(e, t) {
  const n = Be(e);
  return (Ot(n), n);
}
function or(e, t = !1, n = !0) {
  const r = Be(e);
  return (t || (r.equals = lt), ke && n && b !== null && b.l !== null && (b.l.s ??= []).push(r), r);
}
function K(e, t, n = !1) {
  v !== null &&
    (!P || (v.f & $e) !== 0) &&
    Ee() &&
    (v.f & (g | G | Le | $e)) !== 0 &&
    (N === null || !re.call(N, e)) &&
    Jt();
  let r = n ? _e(t) : t;
  return Fe(e, r);
}
function Fe(e, t) {
  if (!e.equals(t)) {
    var n = e.v;
    (te ? U.set(e, t) : U.set(e, n), (e.v = t));
    var r = ce.ensure();
    if ((r.capture(e, n), (e.f & g) !== 0)) {
      const s = e;
      ((e.f & T) !== 0 && Ue(s), He(s));
    }
    ((e.wv = Dt()),
      yt(e, T),
      Ee() &&
        d !== null &&
        (d.f & y) !== 0 &&
        (d.f & (M | ne)) === 0 &&
        (k === null ? xn([e]) : k.push(e)),
      !r.is_fork && Ce.size > 0 && !wt && En());
  }
  return t;
}
function En() {
  wt = !1;
  for (const e of Ce) ((e.f & y) !== 0 && w(e, F), ge(e) && le(e));
  Ce.clear();
}
function De(e) {
  K(e, e.v + 1);
}
function yt(e, t) {
  var n = e.reactions;
  if (n !== null)
    for (var r = Ee(), s = n.length, f = 0; f < s; f++) {
      var l = n[f],
        o = l.f;
      if (!(!r && l === d)) {
        var i = (o & T) === 0;
        if ((i && w(l, t), (o & g) !== 0)) {
          var a = l;
          (I?.delete(a), (o & J) === 0 && (o & O && (l.f |= J), yt(a, F)));
        } else i && ((o & G) !== 0 && L !== null && L.add(l), Y(l));
      }
    }
}
function _e(e) {
  if (typeof e != "object" || e === null || he in e) return e;
  const t = nt(e);
  if (t !== Yt && t !== qt) return e;
  var n = new Map(),
    r = Mt(e),
    s = q(0),
    f = W,
    l = (o) => {
      if (W === f) return o();
      var i = v,
        a = W;
      (B(null), tt(f));
      var u = o();
      return (B(i), tt(a), u);
    };
  return (
    r && n.set("length", q(e.length)),
    new Proxy(e, {
      defineProperty(o, i, a) {
        (!("value" in a) || a.configurable === !1 || a.enumerable === !1 || a.writable === !1) &&
          $t();
        var u = n.get(i);
        return (
          u === void 0
            ? l(() => {
                var c = q(a.value);
                return (n.set(i, c), c);
              })
            : K(u, a.value, !0),
          !0
        );
      },
      deleteProperty(o, i) {
        var a = n.get(i);
        if (a === void 0) {
          if (i in o) {
            const u = l(() => q(E));
            (n.set(i, u), De(s));
          }
        } else (K(a, E), De(s));
        return !0;
      },
      get(o, i, a) {
        if (i === he) return e;
        var u = n.get(i),
          c = i in o;
        if (
          (u === void 0 &&
            (!c || de(o, i)?.writable) &&
            ((u = l(() => {
              var m = _e(c ? o[i] : E),
                h = q(m);
              return h;
            })),
            n.set(i, u)),
          u !== void 0)
        ) {
          var _ = ve(u);
          return _ === E ? void 0 : _;
        }
        return Reflect.get(o, i, a);
      },
      getOwnPropertyDescriptor(o, i) {
        var a = Reflect.getOwnPropertyDescriptor(o, i);
        if (a && "value" in a) {
          var u = n.get(i);
          u && (a.value = ve(u));
        } else if (a === void 0) {
          var c = n.get(i),
            _ = c?.v;
          if (c !== void 0 && _ !== E)
            return { enumerable: !0, configurable: !0, value: _, writable: !0 };
        }
        return a;
      },
      has(o, i) {
        if (i === he) return !0;
        var a = n.get(i),
          u = (a !== void 0 && a.v !== E) || Reflect.has(o, i);
        if (a !== void 0 || (d !== null && (!u || de(o, i)?.writable))) {
          a === void 0 &&
            ((a = l(() => {
              var _ = u ? _e(o[i]) : E,
                m = q(_);
              return m;
            })),
            n.set(i, a));
          var c = ve(a);
          if (c === E) return !1;
        }
        return u;
      },
      set(o, i, a, u) {
        var c = n.get(i),
          _ = i in o;
        if (r && i === "length")
          for (var m = a; m < c.v; m += 1) {
            var h = n.get(m + "");
            h !== void 0 ? K(h, E) : m in o && ((h = l(() => q(E))), n.set(m + "", h));
          }
        if (c === void 0)
          (!_ || de(o, i)?.writable) && ((c = l(() => q(void 0))), K(c, _e(a)), n.set(i, c));
        else {
          _ = c.v !== E;
          var D = l(() => _e(a));
          K(c, D);
        }
        var Ke = Reflect.getOwnPropertyDescriptor(o, i);
        if ((Ke?.set && Ke.set.call(u, a), !_)) {
          if (r && typeof i == "string") {
            var Xe = n.get("length"),
              Ne = Number(i);
            Number.isInteger(Ne) && Ne >= Xe.v && K(Xe, Ne + 1);
          }
          De(s);
        }
        return !0;
      },
      ownKeys(o) {
        ve(s);
        var i = Reflect.ownKeys(o).filter((c) => {
          var _ = n.get(c);
          return _ === void 0 || _.v !== E;
        });
        for (var [a, u] of n) u.v !== E && !(a in o) && i.push(a);
        return i;
      },
      setPrototypeOf() {
        Wt();
      },
    })
  );
}
var Qe, gn, Et, gt;
function ur() {
  if (Qe === void 0) {
    ((Qe = window), (gn = /Firefox/.test(navigator.userAgent)));
    var e = Element.prototype,
      t = Node.prototype,
      n = Text.prototype;
    ((Et = de(t, "firstChild").get),
      (gt = de(t, "nextSibling").get),
      Ze(e) &&
        ((e.__click = void 0),
        (e.__className = void 0),
        (e.__attributes = null),
        (e.__style = void 0),
        (e.__e = void 0)),
      Ze(n) && (n.__t = void 0));
  }
}
function Se(e = "") {
  return document.createTextNode(e);
}
function Me(e) {
  return Et.call(e);
}
function z(e) {
  return gt.call(e);
}
function cr(e, t) {
  if (!Q) return Me(e);
  var n = Me(S);
  if (n === null) n = S.appendChild(Se());
  else if (t && n.nodeType !== xe) {
    var r = Se();
    return (n?.before(r), fe(r), r);
  }
  return (t && Ge(n), fe(n), n);
}
function _r(e, t = !1) {
  if (!Q) {
    var n = Me(e);
    return n instanceof Comment && n.data === "" ? z(n) : n;
  }
  if (t) {
    if (S?.nodeType !== xe) {
      var r = Se();
      return (S?.before(r), fe(r), r);
    }
    Ge(S);
  }
  return S;
}
function vr(e, t = 1, n = !1) {
  let r = Q ? S : e;
  for (var s; t--; ) ((s = r), (r = z(r)));
  if (!Q) return r;
  if (n) {
    if (r?.nodeType !== xe) {
      var f = Se();
      return (r === null ? s?.after(f) : r.before(f), fe(f), f);
    }
    Ge(r);
  }
  return (fe(r), r);
}
function dr(e) {
  e.textContent = "";
}
function hr() {
  return !1;
}
function pr(e, t, n) {
  return document.createElementNS(nn, e, void 0);
}
function Ge(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === xe; )
    (t.remove(), (e.nodeValue += t.nodeValue), (t = e.nextSibling));
}
function mt(e) {
  var t = v,
    n = d;
  (B(null), ae(null));
  try {
    return e();
  } finally {
    (B(t), ae(n));
  }
}
function bt(e) {
  (d === null && (v === null && Xt(), Kt()), te && zt());
}
function mn(e, t) {
  var n = t.last;
  n === null ? (t.last = t.first = e) : ((n.next = e), (e.prev = n), (t.last = e));
}
function j(e, t) {
  var n = d;
  n !== null && (n.f & C) !== 0 && (e |= C);
  var r = {
      ctx: b,
      deps: null,
      nodes: null,
      f: e | T | O,
      first: null,
      fn: t,
      last: null,
      next: null,
      parent: n,
      b: n && n.b,
      prev: null,
      teardown: null,
      wv: 0,
      ac: null,
    },
    s = r;
  if ((e & oe) !== 0) ie !== null ? ie.push(r) : Y(r);
  else if (t !== null) {
    try {
      le(r);
    } catch (l) {
      throw (ee(r), l);
    }
    s.deps === null &&
      s.teardown === null &&
      s.nodes === null &&
      s.first === s.last &&
      (s.f & ye) === 0 &&
      ((s = s.first), (e & G) !== 0 && (e & Te) !== 0 && s !== null && (s.f |= Te));
  }
  if (
    s !== null &&
    ((s.parent = n), n !== null && mn(s, n), v !== null && (v.f & g) !== 0 && (e & ne) === 0)
  ) {
    var f = v;
    (f.effects ??= []).push(s);
  }
  return r;
}
function Tt() {
  return v !== null && !P;
}
function bn(e) {
  const t = j(se, null);
  return (w(t, y), (t.teardown = e), t);
}
function wr(e) {
  bt();
  var t = d.f,
    n = !v && (t & M) !== 0 && (t & ue) === 0;
  if (n) {
    var r = b;
    (r.e ??= []).push(e);
  } else return At(e);
}
function At(e) {
  return j(oe | ft, e);
}
function yr(e) {
  return (bt(), j(se | ft, e));
}
function Er(e) {
  ce.ensure();
  const t = j(ne | ye, e);
  return (n = {}) =>
    new Promise((r) => {
      n.outro
        ? Sn(t, () => {
            (ee(t), r(void 0));
          })
        : (ee(t), r(void 0));
    });
}
function gr(e) {
  return j(oe, e);
}
function Tn(e) {
  return j(Le | ye, e);
}
function mr(e, t = 0) {
  return j(se | t, e);
}
function br(e, t = [], n = [], r = []) {
  cn(r, t, n, (s) => {
    j(se, () => e(...s.map(ve)));
  });
}
function Tr(e, t = 0) {
  var n = j(G | t, e);
  return n;
}
function Ar(e) {
  return j(M | ye, e);
}
function Rt(e) {
  var t = e.teardown;
  if (t !== null) {
    const n = te,
      r = v;
    (et(!0), B(null));
    try {
      t.call(null);
    } finally {
      (et(n), B(r));
    }
  }
}
function ze(e, t = !1) {
  var n = e.first;
  for (e.first = e.last = null; n !== null; ) {
    const s = n.ac;
    s !== null &&
      mt(() => {
        s.abort(X);
      });
    var r = n.next;
    ((n.f & ne) !== 0 ? (n.parent = null) : ee(n, t), (n = r));
  }
}
function An(e) {
  for (var t = e.first; t !== null; ) {
    var n = t.next;
    ((t.f & M) === 0 && ee(t), (t = n));
  }
}
function ee(e, t = !0) {
  var n = !1;
  ((t || (e.f & Bt) !== 0) &&
    e.nodes !== null &&
    e.nodes.end !== null &&
    (Rn(e.nodes.start, e.nodes.end), (n = !0)),
    ze(e, t && !n),
    we(e, 0),
    w(e, H));
  var r = e.nodes && e.nodes.t;
  if (r !== null) for (const f of r) f.stop();
  Rt(e);
  var s = e.parent;
  (s !== null && s.first !== null && St(e),
    (e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = null));
}
function Rn(e, t) {
  for (; e !== null; ) {
    var n = e === t ? null : z(e);
    (e.remove(), (e = n));
  }
}
function St(e) {
  var t = e.parent,
    n = e.prev,
    r = e.next;
  (n !== null && (n.next = r),
    r !== null && (r.prev = n),
    t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n)));
}
function Sn(e, t, n = !0) {
  var r = [];
  xt(e, r, !0);
  var s = () => {
      (n && ee(e), t && t());
    },
    f = r.length;
  if (f > 0) {
    var l = () => --f || s();
    for (var o of r) o.out(l);
  } else s();
}
function xt(e, t, n) {
  if ((e.f & C) === 0) {
    e.f ^= C;
    var r = e.nodes && e.nodes.t;
    if (r !== null) for (const o of r) (o.is_global || n) && t.push(o);
    for (var s = e.first; s !== null; ) {
      var f = s.next,
        l = (s.f & Te) !== 0 || ((s.f & M) !== 0 && (e.f & G) !== 0);
      (xt(s, t, l ? n : !1), (s = f));
    }
  }
}
function Rr(e) {
  kt(e, !0);
}
function kt(e, t) {
  if ((e.f & C) !== 0) {
    ((e.f ^= C), (e.f & y) === 0 && (w(e, T), Y(e)));
    for (var n = e.first; n !== null; ) {
      var r = n.next,
        s = (n.f & Te) !== 0 || (n.f & M) !== 0;
      (kt(n, s ? t : !1), (n = r));
    }
    var f = e.nodes && e.nodes.t;
    if (f !== null) for (const l of f) (l.is_global || t) && l.in();
  }
}
function Sr(e, t) {
  if (e.nodes)
    for (var n = e.nodes.start, r = e.nodes.end; n !== null; ) {
      var s = n === r ? null : z(n);
      (t.append(n), (n = s));
    }
}
let be = !1,
  te = !1;
function et(e) {
  te = e;
}
let v = null,
  P = !1;
function B(e) {
  v = e;
}
let d = null;
function ae(e) {
  d = e;
}
let N = null;
function Ot(e) {
  v !== null && (N === null ? (N = [e]) : N.push(e));
}
let R = null,
  x = 0,
  k = null;
function xn(e) {
  k = e;
}
let Nt = 1,
  $ = 0,
  W = $;
function tt(e) {
  W = e;
}
function Dt() {
  return ++Nt;
}
function ge(e) {
  var t = e.f;
  if ((t & T) !== 0) return !0;
  if ((t & g && (e.f &= ~J), (t & F) !== 0)) {
    for (var n = e.deps, r = n.length, s = 0; s < r; s++) {
      var f = n[s];
      if ((ge(f) && ht(f), f.wv > e.wv)) return !0;
    }
    (t & O) !== 0 && I === null && w(e, y);
  }
  return !1;
}
function It(e, t, n = !0) {
  var r = e.reactions;
  if (r !== null && !(N !== null && re.call(N, e)))
    for (var s = 0; s < r.length; s++) {
      var f = r[s];
      (f.f & g) !== 0 ? It(f, t, !1) : t === f && (n ? w(f, T) : (f.f & y) !== 0 && w(f, F), Y(f));
    }
}
function Pt(e) {
  var t = R,
    n = x,
    r = k,
    s = v,
    f = N,
    l = b,
    o = P,
    i = W,
    a = e.f;
  ((R = null),
    (x = 0),
    (k = null),
    (v = (a & (M | ne)) === 0 ? e : null),
    (N = null),
    Ae(e.ctx),
    (P = !1),
    (W = ++$),
    e.ac !== null &&
      (mt(() => {
        e.ac.abort(X);
      }),
      (e.ac = null)));
  try {
    e.f |= Ie;
    var u = e.fn,
      c = u();
    e.f |= ue;
    var _ = e.deps,
      m = p?.is_fork;
    if (R !== null) {
      var h;
      if ((m || we(e, x), _ !== null && x > 0))
        for (_.length = x + R.length, h = 0; h < R.length; h++) _[x + h] = R[h];
      else e.deps = _ = R;
      if (Tt() && (e.f & O) !== 0) for (h = x; h < _.length; h++) (_[h].reactions ??= []).push(e);
    } else !m && _ !== null && x < _.length && (we(e, x), (_.length = x));
    if (Ee() && k !== null && !P && _ !== null && (e.f & (g | F | T)) === 0)
      for (h = 0; h < k.length; h++) It(k[h], e);
    if (s !== null && s !== e) {
      if (($++, s.deps !== null)) for (let D = 0; D < n; D += 1) s.deps[D].rv = $;
      if (t !== null) for (const D of t) D.rv = $;
      k !== null && (r === null ? (r = k) : r.push(...k));
    }
    return ((e.f & V) !== 0 && (e.f ^= V), c);
  } catch (D) {
    return fn(D);
  } finally {
    ((e.f ^= Ie), (R = t), (x = n), (k = r), (v = s), (N = f), Ae(l), (P = o), (W = i));
  }
}
function kn(e, t) {
  let n = t.reactions;
  if (n !== null) {
    var r = jt.call(n, e);
    if (r !== -1) {
      var s = n.length - 1;
      s === 0 ? (n = t.reactions = null) : ((n[r] = n[s]), n.pop());
    }
  }
  if (n === null && (t.f & g) !== 0 && (R === null || !re.call(R, t))) {
    var f = t;
    ((f.f & O) !== 0 && ((f.f ^= O), (f.f &= ~J)), He(f), yn(f), we(f, 0));
  }
}
function we(e, t) {
  var n = e.deps;
  if (n !== null) for (var r = t; r < n.length; r++) kn(e, n[r]);
}
function le(e) {
  var t = e.f;
  if ((t & H) === 0) {
    w(e, y);
    var n = d,
      r = be;
    ((d = e), (be = !0));
    try {
      ((t & (G | st)) !== 0 ? An(e) : ze(e), Rt(e));
      var s = Pt(e);
      ((e.teardown = typeof s == "function" ? s : null), (e.wv = Nt));
      var f;
    } finally {
      ((be = r), (d = n));
    }
  }
}
async function xr() {
  (await Promise.resolve(), on());
}
function kr() {
  return ce.ensure().settled();
}
function ve(e) {
  var t = e.f,
    n = (t & g) !== 0;
  if (v !== null && !P) {
    var r = d !== null && (d.f & H) !== 0;
    if (!r && (N === null || !re.call(N, e))) {
      var s = v.deps;
      if ((v.f & Ie) !== 0)
        e.rv < $ &&
          ((e.rv = $),
          R === null && s !== null && s[x] === e ? x++ : R === null ? (R = [e]) : R.push(e));
      else {
        (v.deps ??= []).push(e);
        var f = e.reactions;
        f === null ? (e.reactions = [v]) : re.call(f, v) || f.push(v);
      }
    }
  }
  if (te && U.has(e)) return U.get(e);
  if (n) {
    var l = e;
    if (te) {
      var o = l.v;
      return ((((l.f & y) === 0 && l.reactions !== null) || Ft(l)) && (o = Ue(l)), U.set(l, o), o);
    }
    var i = (l.f & O) === 0 && !P && v !== null && (be || (v.f & O) !== 0),
      a = (l.f & ue) === 0;
    (ge(l) && (i && (l.f |= O), ht(l)), i && !a && (pt(l), Ct(l)));
  }
  if (I?.has(e)) return I.get(e);
  if ((e.f & V) !== 0) throw e.v;
  return e.v;
}
function Ct(e) {
  if (((e.f |= O), e.deps !== null))
    for (const t of e.deps)
      ((t.reactions ??= []).push(e), (t.f & g) !== 0 && (t.f & O) === 0 && (pt(t), Ct(t)));
}
function Ft(e) {
  if (e.v === E) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps) if (U.has(t) || ((t.f & g) !== 0 && Ft(t))) return !0;
  return !1;
}
function Or(e) {
  var t = P;
  try {
    return ((P = !0), e());
  } finally {
    P = t;
  }
}
function Nr(e) {
  if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
    if (he in e) je(e);
    else if (!Array.isArray(e))
      for (let t in e) {
        const n = e[t];
        typeof n == "object" && n && he in n && je(n);
      }
  }
}
function je(e, t = new Set()) {
  if (typeof e == "object" && e !== null && !(e instanceof EventTarget) && !t.has(e)) {
    (t.add(e), e instanceof Date && e.getTime());
    for (let r in e)
      try {
        je(e[r], t);
      } catch {}
    const n = nt(e);
    if (
      n !== Object.prototype &&
      n !== Array.prototype &&
      n !== Map.prototype &&
      n !== Set.prototype &&
      n !== Date.prototype
    ) {
      const r = Lt(n);
      for (let s in r) {
        const f = r[s].get;
        if (f)
          try {
            f.call(e);
          } catch {}
      }
    }
  }
}
export {
  Hn as $,
  tr as A,
  vr as B,
  ke as C,
  pr as D,
  Me as E,
  gn as F,
  $n as G,
  d as H,
  er as I,
  xe as J,
  fe as K,
  Ge as L,
  Tr as M,
  sr as N,
  en as O,
  rr as P,
  Qn as Q,
  ue as R,
  it as S,
  Zn as T,
  tn as U,
  Fe as V,
  In as W,
  jn as X,
  hn as Y,
  Mt as Z,
  On as _,
  p as a,
  Un as a0,
  or as a1,
  Be as a2,
  Vn as a3,
  C as a4,
  M as a5,
  dr as a6,
  z as a7,
  Te as a8,
  Cn as a9,
  ur as aA,
  Qt as aB,
  Ye as aC,
  Ln as aD,
  Er as aE,
  qe as aF,
  gr as aG,
  he as aH,
  de as aI,
  Yn as aJ,
  zn as aK,
  _e as aL,
  K as aM,
  te as aN,
  H as aO,
  Kn as aP,
  Gn as aQ,
  Bn as aR,
  Xn as aS,
  Pn as aT,
  on as aU,
  xr as aV,
  q as aW,
  lr as aX,
  Ht as aY,
  rn as aZ,
  kr as a_,
  nn as aa,
  Mn as ab,
  nt as ac,
  Lt as ad,
  Tt as ae,
  mr as af,
  De as ag,
  We as ah,
  Ut as ai,
  Wn as aj,
  ce as ak,
  w as al,
  T as am,
  Y as an,
  F as ao,
  ln as ap,
  ae as aq,
  B as ar,
  Ae as as,
  fn as at,
  v as au,
  Re as av,
  ye as aw,
  qn as ax,
  Jn as ay,
  Nn as az,
  Ar as b,
  Se as c,
  ee as d,
  fr as e,
  S as f,
  b as g,
  Q as h,
  wr as i,
  Or as j,
  Vt as k,
  Dn as l,
  Sr as m,
  nr as n,
  ve as o,
  Sn as p,
  Nr as q,
  Rr as r,
  hr as s,
  Ve as t,
  yr as u,
  ir as v,
  _r as w,
  br as x,
  ar as y,
  cr as z,
};
