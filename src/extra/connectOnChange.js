import _ from 'lodash'
import { connect } from 'react-redux'
import { shallowEqual } from 'recompose'

import { getStore } from '../store'

const ALWAYS_EQUAL = 'ALWAYS_EQUAL'
const ALWAYS_DIFF = 'ALWAYS_DIFF'

const getKeys = arg => {
  if (arg === '') return ALWAYS_EQUAL
  if (typeof arg === 'string') return _.uniq(_.compact(arg.split(',').map(_.trim)))
  return ALWAYS_DIFF
}

const pickByKeys = (props, keys, groupWarnIfNotFound) => {
  if (keys === ALWAYS_EQUAL) return null
  if (keys === ALWAYS_DIFF) return props
  return _.reduce(
    keys,
    (ret, key) => {
      if (process.env.NODE_ENV === 'development' && groupWarnIfNotFound && !props[key]) {
        console.error(`${groupWarnIfNotFound} "${key}" not found`)
      }
      ret[key] = props[key]
      return ret
    },
    {}
  )
}

export default ({ collections: _collectionNames, props: _propsKeys }, mapStateFunc) => {
  const collNames = getKeys(_collectionNames)
  const propKeys = getKeys(_propsKeys)

  const stateAlwaysDiff = collNames === ALWAYS_DIFF
  const propsAlwaysDiff = propKeys === ALWAYS_DIFF
  if (stateAlwaysDiff && propsAlwaysDiff) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Use connectOnChange without collections:string or props:string option. You need at least one of them.')
    }
    return mapStateFunc
  }

  return connect(() => {
    let currProps
    let currState
    let currResult

    // create and return memoizer func per component
    return (state, props) => {
      let nextState
      let isStateEqual
      if (stateAlwaysDiff) {
        nextState = state.datavan
        isStateEqual = nextState === currState
      } else {
        nextState = _.mapValues(pickByKeys(state.datavan, collNames, 'collections'), 'byId')
        isStateEqual = shallowEqual(nextState, currState)
      }

      const nextProps = pickByKeys(props, propKeys)
      if (isStateEqual && shallowEqual(nextProps, currProps)) return currResult

      currState = nextState
      currProps = nextProps
      // real running of memoize
      const { vanCtx } = getStore(state)
      const _inConnectOnChange = vanCtx.inConnectOnChange
      vanCtx.inConnectOnChange = true
      currResult = mapStateFunc(state, props)
      vanCtx.inConnectOnChange = _inConnectOnChange
      return currResult
    }
  })
}
