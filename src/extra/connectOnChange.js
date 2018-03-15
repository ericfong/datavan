import _ from 'lodash'
import { connect } from 'react-redux'
import { shallowEqual } from 'recompose'

import { getStore } from '../store'

export default function connectOnChange(propKeys, mapStateFunc) {
  if (!mapStateFunc) return connect()
  propKeys = _.uniq(_.compact(propKeys))

  /*
  NOTE after react-redux@5.0.0, connect default as pure, in which mapStateFunc will only be run if redux-state or props are changed

  For deep-component which want to listen to react-router location changes
  Because react-router history won't trigger redux-state change, mapStateFunc will not be run even location changed

  So, pass location.query as props or sync router state into redux-state
  And all datavan's source-of-truth state should be inside redux-state
  */
  return connect(() => {
    let currProps
    let currState
    let currResult
    let onChangeTables

    // create and return memoizer func per component
    return (state, props) => {
      const { vanCtx, vanDb } = getStore(state)

      const nextState = _.mapValues(onChangeTables, (v, collName) => vanDb[collName].getState())
      const isStateEqual = shallowEqual(nextState, currState)

      const nextProps = _.pick(props, propKeys)
      if (isStateEqual && shallowEqual(nextProps, currProps)) return currResult
      // console.log('>>>', onChangeTables, {
      //   stateDiff: !isStateEqual && [nextState, currState],
      //   propsDiff: !shallowEqual(nextProps, currProps) && [nextProps, currProps],
      // })
      currState = nextState
      currProps = nextProps

      // real running of memoize
      const _inConnectOnChange = vanCtx.inConnectOnChange
      if (process.env.NODE_ENV !== 'production' && _inConnectOnChange) {
        console.warn('vanCtx.inConnectOnChange set to true already! Duplicated connectOnChange()?')
      }

      vanCtx.inConnectOnChange = true
      vanCtx.onChangeTables = {}

      currResult = mapStateFunc(state, props)

      onChangeTables = vanCtx.onChangeTables
      vanCtx.onChangeTables = null
      vanCtx.inConnectOnChange = _inConnectOnChange
      return currResult
    }
  })
}
