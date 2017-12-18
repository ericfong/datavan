export default function runHook(hook, next, ...args) {
  if (hook) return hook(next, ...args)
  if (next) return next(...args)
}

export function trapArgs(baseHook, func) {
  return (next, ...args) => {
    const newArgs = func(...args)
    return runHook(baseHook, next, ...(newArgs || args))
  }
}
