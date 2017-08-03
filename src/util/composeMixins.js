import _ from 'lodash'

export function normalizeMixin(mixin) {
  if (typeof mixin === 'function') return mixin
  return (ctx, next) => next({ ...ctx, ...mixin })
}

// Mixin: (ctx, next) => next(ctx) | ctx

function runMiddlewares(ctx, middlewares, i = 0) {
  const curMiddleware = middlewares[i]
  if (!curMiddleware) return ctx

  const ret = curMiddleware(ctx, (nextCtx = ctx) => runMiddlewares(nextCtx, middlewares, i + 1))

  return ret || ctx
}

export default function (..._mixins) {
  const mixins = _.map(_.compact(_.flattenDeep(_mixins)), normalizeMixin)

  if (mixins.length === 0) {
    return (ctx, next) => next(ctx)
  }

  if (mixins.length === 1) {
    return mixins[0]
  }

  return (ctx, next) => {
    const ret = runMiddlewares(ctx, mixins)
    return next ? next(ret) : ret
  }
}
