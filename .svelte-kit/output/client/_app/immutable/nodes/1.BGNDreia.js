import { a as d, f as x } from "../chunks/BtzawNjK.js";
import "../chunks/CMWHeIi6.js";
import {
  g as b,
  u as k,
  i as l,
  j as y,
  k as c,
  l as j,
  o as h,
  q,
  t as w,
  v as z,
  w as A,
  x as B,
  y as E,
  z as u,
  A as m,
  B as C,
} from "../chunks/CYuLPLop.js";
import { s as _ } from "../chunks/DVxR7C2P.js";
import { p as v } from "../chunks/6vG7ubTH.js";
function D(a = !1) {
  const e = b,
    t = e.l.u;
  if (!t) return;
  let r = () => q(e.s);
  if (a) {
    let o = 0,
      s = {};
    const f = w(() => {
      let p = !1;
      const i = e.s;
      for (const n in i) i[n] !== s[n] && ((s[n] = i[n]), (p = !0));
      return (p && o++, o);
    });
    r = () => h(f);
  }
  (t.b.length &&
    k(() => {
      (g(e, r), c(t.b));
    }),
    l(() => {
      const o = y(() => t.m.map(j));
      return () => {
        for (const s of o) typeof s == "function" && s();
      };
    }),
    t.a.length &&
      l(() => {
        (g(e, r), c(t.a));
      }));
}
function g(a, e) {
  if (a.l.s) for (const t of a.l.s) h(t);
  e();
}
var F = x("<h1> </h1> <p> </p>", 1);
function L(a, e) {
  (z(e, !1), D());
  var t = F(),
    r = A(t),
    o = u(r, !0);
  m(r);
  var s = C(r, 2),
    f = u(s, !0);
  (m(s),
    B(() => {
      (_(o, v.status), _(f, v.error?.message));
    }),
    d(a, t),
    E());
}
export { L as component };
