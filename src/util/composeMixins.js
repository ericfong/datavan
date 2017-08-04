import _ from 'lodash'
import { compose } from 'redux'

export function normalizeMixin(mixin) {
  if (typeof mixin === 'function') {
    return base => {
      mixin(base)
      // enforce alway the same obj
      return base
    }
  }
  return base => Object.assign(base, mixin)
}

// function runMiddlewares(ctx, middlewares, i = 0) {
//   const curMiddleware = middlewares[i]
//   if (!curMiddleware) return ctx
//
//   const ret = curMiddleware(ctx, (nextCtx = ctx) => runMiddlewares(nextCtx, middlewares, i + 1))
//
//   return ret || ctx
// }

export default function (..._mixins) {
  return compose(..._.map(_.compact(_.flattenDeep(_mixins)), normalizeMixin))
}
