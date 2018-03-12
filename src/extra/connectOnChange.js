import _ from 'lodash'
import { connect } from 'react-redux'
import { shallowEqual } from 'recompose'

import { getStore } from '../store'

const pickByKeys = (props, keys) => {
  // const ALWAYS_DIFF = 'ALWAYS_DIFF'
  if (!keys) return props
  // const ALWAYS_EQUAL = 'ALWAYS_EQUAL'
  if (keys.length === 0) return null
  return _.pick(props, keys)
}

export default function connectOnChange(conf, mapStateFunc) {
  if (!conf) return connect()

  if (process.env.NODE_ENV !== 'production' && !Array.isArray(conf)) {
    console.warn('Please use connectOnChange([array-of-collection-names], mapStateFunc)')
  }
  const propKeys = conf ? _.uniq(_.compact(conf)) : null

  return connect(() => {
    let currProps
    let currState
    let currResult
    let onChangeTables

    // create and return memoizer func per component
    return (state, props) => {
      const nextState = pickByKeys(state.datavan, onChangeTables)
      const isStateEqual = shallowEqual(nextState, currState)

      const nextProps = pickByKeys(props, propKeys)
      // console.log('>>>', onChangeTables, isStateEqual, shallowEqual(nextProps, currProps))
      if (isStateEqual && shallowEqual(nextProps, currProps)) return currResult
      currState = nextState
      currProps = nextProps

      // real running of memoize
      const { vanCtx } = getStore(state)
      const _inConnectOnChange = vanCtx.inConnectOnChange
      if (process.env.NODE_ENV !== 'production' && _inConnectOnChange) {
        console.warn('vanCtx.inConnectOnChange set to true already! Duplicated connectOnChange()?')
      }

      vanCtx.inConnectOnChange = true
      vanCtx.onChangeTables = []

      currResult = mapStateFunc(state, props)

      onChangeTables = _.uniq(vanCtx.onChangeTables)
      vanCtx.onChangeTables = null
      vanCtx.inConnectOnChange = _inConnectOnChange
      return currResult
    }
  })
}
