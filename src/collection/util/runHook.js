const noop = () => {}

export default function runHook(hook, next, ...args) {
  if (hook) return hook(next || noop, ...args)
  if (next) return next(...args)
}
