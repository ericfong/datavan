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

const getConf = conf => {
  if (typeof conf === 'object' && !Array.isArray(conf)) {
    if (process.env.NODE_ENV !== 'production') console.warn('Please use connectOnChange([array-of-collection-names], mapStateFunc)')
    conf = conf.props && conf.props.split(',').map(_.trim)
  }
  return conf ? _.uniq(_.compact(conf)) : null
}

export default function connectOnChange(conf, mapStateFunc) {
  const propKeys = getConf(conf)

  return connect(() => {
    let currProps
    let currState
    let currResult
    let onChangeTables

    // create and return memoizer func per component
    return (state, props) => {
      // console.log('>>>', onChangeTables)
      const nextState = _.mapValues(pickByKeys(state.datavan, onChangeTables), 'byId')
      const isStateEqual = shallowEqual(nextState, currState)

      const nextProps = pickByKeys(props, propKeys)
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
