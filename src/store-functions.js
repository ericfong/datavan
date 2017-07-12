import _ from 'lodash'

export function serverPreload({ setContext }, onOff) {
  setContext({ serverPreloading: onOff !== false })
}

export function invalidate({ collections }) {
  _.each(collections, coll => coll.invalidate && coll.invalidate())
}

export function autoInvalidate({ collections }) {
  _.each(collections, coll => coll.autoInvalidate && coll.autoInvalidate())
}

export function allPending(store) {
  const { collections, context } = store
  const promises = _.compact(_.flatMap(collections, collection => collection.allPendings && collection.allPendings()))
  if (context.dispatchPromise) promises.push(context.dispatchPromise)
  if (promises.length <= 0) return null
  // TODO timeout or have a limit for recursive wait for promise
  return Promise.all(promises).then(() => allPending(store))
}

export function serverRender(store, renderCallback) {
  const { setContext } = store
  setContext({ duringServerPreload: true })

  const output = renderCallback()

  // recursive serverRender & promise.then
  const promise = allPending(store)
  if (promise) {
    return promise.then(() => serverRender(store, renderCallback))
  }

  setContext({ duringServerPreload: false })
  return output
}
