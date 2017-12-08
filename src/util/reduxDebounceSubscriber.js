export default function reduxDebounceSubscriber() {
  return _createStore => (...args) => {
    const store = _createStore(...args)
    const { subscribe: oriSubscribe } = store

    let flushingPromise

    return Object.assign(store, {
      subscribe(listener) {
        const runOriListener = () => {
          listener()
          flushingPromise = null
        }

        const wrappedListener = () => {
          if (store.shouldFlush) {
            return runOriListener()
          }
          if (flushingPromise) return

          const curP = new Promise(resolve => {
            setTimeout(() => {
              if (curP === flushingPromise) runOriListener()
              resolve()
            })
          })
          flushingPromise = curP
        }

        return oriSubscribe(wrappedListener)
      },

      flush(func) {
        if (func) {
          const oriShouldFlush = store.shouldFlush
          store.shouldFlush = true
          func()
          store.shouldFlush = oriShouldFlush
        }
        return flushingPromise
      },

      debounce(func) {
        if (func) {
          const oriShouldFlush = store.shouldFlush
          store.shouldFlush = false
          func()
          store.shouldFlush = oriShouldFlush
        }
        return flushingPromise
      },

      setAlwaysFlush(_shouldFlush) {
        store.shouldFlush = _shouldFlush
      },
    })
  }
}
