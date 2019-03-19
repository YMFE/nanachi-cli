const uidSet = new Set();

function next(): string {
  const uid = generate();

  if (uidSet.has(uid)) {
    return next();
  }

  uidSet.add(uid);
  return uid;
}

function generate() {
  return Math.random()
    .toString(36)
    .slice(2, 8);
}

export default { next };
