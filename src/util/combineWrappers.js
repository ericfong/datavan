import _ from 'lodash'

export function normalizeWrapper(wrapper) {
  if (typeof wrapper === 'function') return wrapper
  return (ctx, next) => next({ ...ctx, ...wrapper })
}

// Wrapper: (ctx, next) => next(ctx) | ctx

function runMiddlewares(ctx, middlewares, i = 0) {
  const curMiddleware = middlewares[i]
  if (!curMiddleware) return ctx

  const ret = curMiddleware(ctx, (nextCtx = ctx) => runMiddlewares(nextCtx, middlewares, i + 1))

  return ret || ctx
}

export default function (..._wrappers) {
  const wrappers = _.map(_.compact(_.flattenDeep(_wrappers)), normalizeWrapper)

  if (wrappers.length === 0) {
    return (ctx, next) => next(ctx)
  }

  if (wrappers.length === 1) {
    return wrappers[0]
  }

  return (ctx, next) => {
    const ret = runMiddlewares(ctx, wrappers)
    return next ? next(ret) : ret
  }
}
