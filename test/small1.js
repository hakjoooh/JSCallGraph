function f() {
  g();
}

function g() {
  return;
}

function main() {
  f();
  f();
  g();
  (function (k) { f(); return k; })(1);
}
