import {
  r as A,
  d,
  p as P,
  c as y,
  b,
  a as $,
  h as O,
  f as M,
  m as D,
  s as F,
} from "./CYuLPLop.js";
class X {
  anchor;
  #t = new Map();
  #o = new Map();
  #e = new Map();
  #n = new Set();
  #r = !0;
  constructor(e, o = !0) {
    ((this.anchor = e), (this.#r = o));
  }
  #a = (e) => {
    if (this.#t.has(e)) {
      var o = this.#t.get(e),
        n = this.#o.get(o);
      if (n) (A(n), this.#n.delete(o));
      else {
        var a = this.#e.get(o);
        a &&
          (this.#o.set(o, a.effect),
          this.#e.delete(o),
          a.fragment.lastChild.remove(),
          this.anchor.before(a.fragment),
          (n = a.effect));
      }
      for (const [r, s] of this.#t) {
        if ((this.#t.delete(r), r === e)) break;
        const i = this.#e.get(s);
        i && (d(i.effect), this.#e.delete(s));
      }
      for (const [r, s] of this.#o) {
        if (r === o || this.#n.has(r)) continue;
        const i = () => {
          if (Array.from(this.#t.values()).includes(r)) {
            var l = document.createDocumentFragment();
            (D(s, l), l.append(y()), this.#e.set(r, { effect: s, fragment: l }));
          } else d(s);
          (this.#n.delete(r), this.#o.delete(r));
        };
        this.#r || !n ? (this.#n.add(r), P(s, i, !1)) : i();
      }
    }
  };
  #i = (e) => {
    this.#t.delete(e);
    const o = Array.from(this.#t.values());
    for (const [n, a] of this.#e) o.includes(n) || (d(a.effect), this.#e.delete(n));
  };
  ensure(e, o) {
    var n = $,
      a = F();
    if (o && !this.#o.has(e) && !this.#e.has(e))
      if (a) {
        var r = document.createDocumentFragment(),
          s = y();
        (r.append(s), this.#e.set(e, { effect: b(() => o(s)), fragment: r }));
      } else
        this.#o.set(
          e,
          b(() => o(this.anchor)),
        );
    if ((this.#t.set(n, e), a)) {
      for (const [i, c] of this.#o) i === e ? n.unskip_effect(c) : n.skip_effect(c);
      for (const [i, c] of this.#e) i === e ? n.unskip_effect(c.effect) : n.skip_effect(c.effect);
      (n.oncommit(this.#a), n.ondiscard(this.#i));
    } else (O && (this.anchor = M), this.#a(n));
  }
}
const I = {},
  m = "en",
  g = ["en", "ko-kr"],
  C = "PARAGLIDE_LOCALE",
  B = 3456e4,
  p = ["cookie", "globalVariable", "baseLocale"],
  k = [];
let v, U;
function T(t) {
  if (k.length === 0) return;
  const e = typeof t == "string" ? t : t.href;
  if (v === e) return U;
  const o = new URL(e, "http://dummy.com");
  let n;
  for (const a of k)
    if (new I(a.match, o.href).exec(o.href)) {
      n = a;
      break;
    }
  return ((v = e), (U = n), n);
}
function E(t) {
  const e = T(t);
  return e && e.exclude !== !0 && Array.isArray(e.strategy) ? e.strategy : p;
}
globalThis.__paraglide = {};
let f,
  S = !1,
  w = () => {
    let t = p;
    typeof window < "u" && window.location?.href && (t = E(window.location.href));
    const e = V(t);
    if (e) return (S || ((f = e), (S = !0), N(e, { reload: !1 })), e);
    throw new Error(
      "No locale found. Read the docs https://inlang.com/m/gerre34r/library-inlang-paraglideJs/errors#no-locale-found",
    );
  };
function V(t, e) {
  let o;
  for (const n of t) {
    if (n === "cookie") o = H();
    else if (n === "baseLocale") o = m;
    else if (n === "globalVariable" && f !== void 0) o = f;
    else if (j(n) && h.has(n)) {
      const a = h.get(n);
      if (a) {
        const r = a.getLocale();
        if (r instanceof Promise) continue;
        o = r;
      }
    }
    if (o !== void 0) return G(o);
  }
}
const W = (t) => {
  window.location.reload();
};
let N = (t, e) => {
    const o = { reload: !0, ...e };
    let n;
    try {
      n = w();
    } catch {}
    const a = [];
    let r = p;
    typeof window < "u" && window.location?.href && (r = E(window.location.href));
    for (const i of r)
      if (i === "globalVariable") f = t;
      else if (i === "cookie") {
        if (typeof document > "u" || typeof window > "u") continue;
        const c = `${C}=${t}; path=/; max-age=${B}`;
        document.cookie = c;
      } else {
        if (i === "baseLocale") continue;
        if (j(i) && h.has(i)) {
          const c = h.get(i);
          if (c) {
            let l = c.setLocale(t);
            l instanceof Promise &&
              ((l = l.catch((z) => {
                throw new Error(`Custom strategy "${i}" setLocale failed.`, { cause: z });
              })),
              a.push(l));
          }
        }
      }
    const s = () => {
      o.reload && window.location && t !== n && W();
    };
    if (a.length)
      return Promise.all(a).then(() => {
        s();
      });
    s();
  },
  L = () => (typeof window < "u" ? window.location.origin : "http://fallback.com");
function u(t) {
  return typeof t != "string" ? !1 : t ? g.some((e) => e.toLowerCase() === t.toLowerCase()) : !1;
}
function G(t) {
  if (typeof t != "string") throw new Error(`Invalid locale: ${t}. Expected a string.`);
  const e = t.toLowerCase(),
    o = g.find((n) => n.toLowerCase() === e);
  if (!o) throw new Error(`Invalid locale: ${t}. Expected one of: ${g.join(", ")}`);
  return o;
}
function H() {
  if (typeof document > "u" || !document.cookie) return;
  const e = document.cookie.match(new RegExp(`(^| )${C}=([^;]+)`))?.[2];
  if (u(e)) return e;
}
let _, R;
function J(t) {
  const e = typeof t == "string" ? t : t.href;
  if (_ === e) return R;
  let o;
  return ((o = Z(t)), (_ = e), (R = o), o);
}
function Z(t) {
  const o = new URL(t, "http://dummy.com").pathname.split("/").filter(Boolean);
  if (o.length > 0) {
    const n = o[0];
    if (u(n)) return n;
  }
  return m;
}
function x(t, e) {
  return q(t, e);
}
function q(t, e) {
  const o = typeof t == "string" ? new URL(t, L()) : new URL(t),
    n = e?.locale ?? w();
  if (J(o) === n) return o;
  const r = o.pathname.split("/").filter(Boolean);
  return (
    r.length > 0 && u(r[0]) && r.shift(),
    n === m ? (o.pathname = "/" + r.join("/")) : (o.pathname = "/" + n + "/" + r.join("/")),
    o
  );
}
function Y(t) {
  return K(t);
}
function K(t) {
  const e = typeof t == "string" ? new URL(t, L()) : new URL(t),
    o = e.pathname.split("/").filter(Boolean);
  return (o.length > 0 && u(o[0]) && (e.pathname = "/" + o.slice(1).join("/")), e);
}
function ee(t, e) {
  const o = w(),
    n = e?.locale ?? o,
    a = new URL(t, L()),
    r = x(a, { locale: n });
  return t.startsWith("/") && a.origin === r.origin
    ? n !== o && x(a, { locale: o }).origin !== r.origin
      ? r.href
      : r.pathname + r.search + r.hash
    : r.href;
}
const h = new Map();
function j(t) {
  return typeof t == "string" && /^custom-[A-Za-z0-9_-]+$/.test(t);
}
export { X as B, ee as a, Y as d, g as l };
