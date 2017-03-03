import _ from 'lodash'

export function override(func, newFunc) {
  if (!func) return newFunc
  return function(...args) {
    const self = this
    const next = function() {return func.apply(self, args)}
    // next.args = args
    return newFunc.apply(self, [next, ...args])
  }
}


function overrideObject(targetStore, over) {
  if (Array.isArray(over)) {
    _.each(_.compact(_.flattenDeep(over)), o => {
      overrideObject(targetStore, o)
    })
    return
  }
  _.each(over, (func, fnName) => {
    if (typeof func === 'function') {
      targetStore[fnName] = override(targetStore[fnName], func)
    } else {
      targetStore[fnName] = func
    }
  })

}

export function combineOverrides(..._overArr) {
  const overArr = _.compact(_.flattenDeep(_overArr))

  const targetDb = {}
  _.each(overArr, overTable => {
    _.each(overTable, (over, name) => {
      let targetStore = targetDb[name]
      if (!targetStore) {
        targetStore = targetDb[name] = {}
      }
      overrideObject(targetStore, over)
    })
  })
  return targetDb
}



// export function extendStoreDefinitions(Class, BaseStore, ...overrides) {
//   Class.definitions = combineOverrides(BaseStore.definitions, ...overrides)
//   return Class
// }
// export default class Database {
//   _state = {}
//   _listeners = []
//
//   constructor() {
//     const definitions = this.constructor.definitions
//     const db = this
//     _.each(definitions, (definition, name) => {
//       db[name] = {
//         dependencies: [],
//         getState: () => db.getStoreState(name),
//         setState: (newStoreState) => db.setStoreState(name, newStoreState),
//         ...definition,
//       }
//     })
//     _.each(definitions, (definition, sourceName) => {
//       const source = db[sourceName]
//       _.each(source.requires, targetName => {
//         const target = db[targetName]
//         if (!target) {
//           throw new Error(`Store Not Found: ${targetName}`)
//         }
//         if (target.dependencies.indexOf(source) >= 0) {
//           throw new Error(`Circular Dependency: ${sourceName} try to depend on ${targetName} which already depend on ${sourceName}`)
//         }
//         source[targetName] = target
//         source.dependencies = source.dependencies.concat([target], target.dependencies)
//       })
//     })
//   }
//
//   getStoreState(name) {
//     return this.getState()[name]
//   }
//
//   setStoreState(name, newStoreState) {
//     const oldState = this.getState()
//     if (oldState[name] !== newStoreState) {
//       this.setState({...oldState, [name]: newStoreState})
//     }
//   }
//
//
//   subscribe(listener) {
//     const listeners = this._listeners
//     if (listeners.indexOf(listener) < 0) {
//       listeners.push(listener)
//     }
//     // return unsubscribe function
//     return () => {
//       this._listeners = listeners.filter(fn => fn !== listener)
//     }
//   }
//
//   getState() {
//     return this._state
//   }
//
//   setState(newState) {
//     this._state = newState
//
//     // use promise to debounce
//     if (this._promise) return
//     this._promise = new Promise(resolve => setTimeout(resolve, 1))
//     .then(() => {
//       this._promise = null
//       for (const listener of this._listeners) {
//         listener(newState)
//       }
//     })
//   }
//
//   getPromise() {
//     let promises = []
//     _.each(this, store => {
//       promises.push(store && store.getPromise && store.getPromise())
//     })
//     if (!this.duringServerPreload && this._promise) {
//       promises.push(this._promise)
//     }
//     promises = _.compact(promises)
//     if (promises.length <= 0) return null
//     return Promise.all(promises)
//     // recursive wait for promise
//     // timeout or have a limit
//     .then(() => this.getPromise())
//   }
// }
