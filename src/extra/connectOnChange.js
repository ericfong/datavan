import _ from 'lodash'
import { connect } from 'react-redux'
import { shallowEqual } from 'recompose'

import { getStore } from '../store'

export default function connectOnChange(propKeys, mapStateFunc, connectOption = {}) {
  if (!mapStateFunc) return connect()
  propKeys = _.uniq(_.compact(propKeys))

  return connect(
    () => {
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
    },
    null,
    null,
    {
      // NOTE after react-redux@5.0.0, default as pure which will not work with react-router for deep-component
      // need to change redux-state or props when history.location change
      // OR mark as NOT-pure
      // mark as NOT-pure as default. Because datavan also have some state that not write into redux-state.
      // also mark as NOT-pure which make mapState nearly always run
      pure: false,

      ...connectOption,
    }
  )
}
