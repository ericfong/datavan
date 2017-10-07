export default function runHook(hook, next, ...args) {
  if (hook) return hook(next, ...args)
  if (next) return next(...args)
}
