import _ from 'lodash'

function runMiddlewares(ctx, middlewares, i = 0) {
  const curMiddleware = middlewares[i]
  if (!curMiddleware) return ctx

  const ret = curMiddleware(ctx, (nextCtx = ctx) => runMiddlewares(nextCtx, middlewares, i + 1))

  return ret || ctx
}

export default function composeMiddlewares(..._middlewares) {
  const middlewares = _.compact(_.flattenDeep(_middlewares))

  if (middlewares.length === 0) {
    return (ctx, next) => next(ctx)
  }

  if (middlewares.length === 1) {
    return middlewares[0]
  }

  return (ctx, next) => {
    const ret = runMiddlewares(ctx, middlewares)
    return next ? next(ret) : ret
  }
}
