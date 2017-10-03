export default function prePostHook(func, hookGetter) {
  let getHook

  if (typeof hookGetter === 'string') {
    getHook = firstArg => firstArg[hookGetter]
  } else {
    getHook = hookGetter
  }

  return function hooked(...args) {
    const hook = getHook.apply(this, args)
    if (!hook) return func.apply(this, args)
    const next = (...newArgs) => func.apply(this, newArgs.length > 0 ? newArgs : args)
    return hook.apply(this, [next, ...args])
  }
}
