export function setAdapters(store, newAdapters) {
  const dv = store.datavan()
  return dv.setAdapters(newAdapters)
}
