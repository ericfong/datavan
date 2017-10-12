export default function runHook(hook, next, ...args) {
  if (hook) return hook(next, ...args)
  if (next) return next(...args)
}

export function wrapHook(baseHook, func) {
  return (next, ...args) => {
    const runNext = (...newArgs) => runHook(baseHook, next, ...newArgs)
    return func(runNext, ...args)
  }
}
