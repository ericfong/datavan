import _ from 'lodash'

export function allPending(dv) {
  const { collections, emitPromise } = dv
  const promises = _.compact(_.flatMap(collections, collection => collection.allPendings && collection.allPendings()))
  if (emitPromise) promises.push(emitPromise)
  if (promises.length <= 0) return null
  // TODO timeout or have a limit for recursive wait for promise
  return Promise.all(promises).then(() => allPending(dv))
}

export default function serverPreload(dv, renderCallback) {
  dv.duringServerPreload = true

  const output = renderCallback()

  // recursive serverRender & promise.then
  const promise = allPending(dv)
  if (promise) {
    return promise.then(() => serverPreload(dv, renderCallback))
  }

  dv.duringServerPreload = false
  return output
}
