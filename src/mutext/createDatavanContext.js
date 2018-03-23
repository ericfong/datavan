import _ from 'lodash'
import { createObservableMutext } from 'create-mutable-context'
import mutateUtil from 'immutability-helper'

// const makeResolve = ctx => {
//   const resolve = query => {
//     ctx.set(prevValue => prevValue + 1)
//     return query
//   }
//   return resolve
// }
// const defaultEnhancer = ctx => {
//   ctx.resolve = makeResolve(ctx)
//   return ctx
// }

const collPrototypes = {
  getData(scope) {
    const data = this[scope]
    if (data) return data
    // if (scope === 'byId')
    // if (scope === 'originals')
    // if (scope === 'origin')
  },
}

const createCollection = (ctx, coll) => {
  return {
    ...collPrototypes,
    mutate(mutation) {
      ctx.set({
        [coll.name]: mutateUtil(),
      })
      // this.store.vanMutates.push({ collectionName: this.name, mutation })
    },
    ...coll,
  }
}

const createDatavanContext = (preload, vanConfig) => {
  const C = createObservableMutext(preload, vanConfig, {
    providerConstruct(provider) {
      const ctx = provider.state

      _.each(vanConfig, (conf, name) => {
        ctx[name] = createCollection(ctx, {
          ...conf,
          ...ctx[name],
          name,
        })
      })

      Object.assign(ctx, {
        vanProviderMemory: {},
        vanConfig,
        // getData: (...args) => getData(ctx, ...args),
      })
    },
    consumerConstruct(consumer) {
      consumer.mixin = {
        vanConsumerMemory: {},
      }
    },
    consumerCtx(ctx, consumer) {
      return { ...ctx, ...consumer.mixin }
    },
  })

  return C
}

/*
const CompA = ({ p1 }) => (
  <C.Consumer observe="bar,foo">
    {ctx => {
      const data = ctx.cache(p1, ctx.s1, () => {

      })
      const data2 = ctx.cache(p2, data.s1, () => {

      })
      return <span prop={ctx.find('x', filter)} />
    }}
  </C.Consumer>
)

const Comp1 = () => (
  <C.Consumer observe="bar,foo">
    {ctx => <span prop={ctx.find('x', filter)} />}
  </C.Consumer>
)
*/

export default createDatavanContext

// export const getData = (coll, views, keys) => {
//   const raw = coll.getState()
//   if (views.submits) {
//     raw.submits = getSubmits(coll)
//   }
//   return raw
// }
