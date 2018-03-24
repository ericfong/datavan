// import _ from 'lodash'
import { createObservableMutext } from 'create-mutable-context'

import createDb from './createDb'
import reduce from './reduce'

const createDatavanContext = (vanProtos, defaultState) => {
  const C = createObservableMutext(defaultState, vanProtos, {
    providerConstruct(provider) {
      const firstState = createDb(vanProtos, {
        getState: () => provider.state,
        dispatch: action => {
          provider.set(prevState => reduce(prevState, action, vanProtos))
        },
      })
      provider.state = firstState
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
*/

export default createDatavanContext
