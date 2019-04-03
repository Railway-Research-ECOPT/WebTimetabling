let find = function (d, x) {
  let cur = x;
  while (d[cur] !== cur) {
	  cur = d[cur];
  }
  d[x] = cur;
  return cur;
};

let union = function (d, x, y) {
  let rx = find(d, x);
  let ry = find(d, y);
  if (rx !== ry) {
	  d[rx] = ry;
  }
};

let addSet = function (d, x) {
  d[x] = x;
};

UF = {find: find, union: union, addSet: addSet};
