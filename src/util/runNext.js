// const next1 = (next, collection, internalVal1, val2) => {
//   return next()
// }
// const next2 = (next, collection, internalVal1, val2) => {
//   return next()
// }

const noop = () => {}

export function wrapNext(middleware2, middleware1) {
  const next = (...newArgs) => {
    const nextArgs = newArgs.length > 0 ? newArgs : args
    if (subNext1) return subNext1(next, ...nextArgs)
    return next(...nextArgs)
  }

  return (next, ...args) => {
    return middleware2(next, ...args)
  }
}

export default function runNext(hook, next, ...args) {
  if (hook) return hook(next || noop, ...args)
  if (!next) return
  return next(...args)
}

// const onInit = (next, collection, internalVal1, val2) => {
//   return next()
// }
//
// // next, args
// function load(collection, arg1, arg2) {
//   runHook(collection.onInit, null, collection, internalVal1, val2)
// }
//
// // Imp:
// const onFind = (next, collection, arg1, arg2) => {
//   return next()
// }
//
// // Client
// function find(collection, arg1, arg2) {
//   runHook(
//     collection.onFind,
//     () => {
//       // real find...
//     },
//     internalVal1,
//     val2
//   )
// }
//
// function mapState(state, props) {
//   find(state, collection, query, option)
//   find(state, { collection, query, option })
//   find({ state, collection, query, option })
// }
