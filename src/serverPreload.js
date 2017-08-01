export default function serverPreload(store, renderCallback) {
  const dv = store.dv
  dv.duringServerPreload = true

  const output = renderCallback()

  // recursive serverRender & promise.then
  const promise = dv.allPending(dv)
  if (promise) {
    return promise.then(() => serverPreload(store, renderCallback))
  }

  dv.duringServerPreload = false
  return output
}
