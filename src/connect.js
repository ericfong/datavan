import PropTypes from 'prop-types'
import React from 'react'
import getContext from 'recompose/getContext'
import createEagerFactory from 'recompose/createEagerFactory'
import setDisplayName from 'recompose/setDisplayName'
import wrapDisplayName from 'recompose/wrapDisplayName'
import compose from 'recompose/compose'
import { connect } from 'react-redux'

import ensureCollections from './ensureCollections'

const defineHoc = (name, createHocFunc) => (...args) => BaseComponent => {
  const factory = createEagerFactory(BaseComponent)
  const Comp = createHocFunc(factory, ...args)
  if (process.env.NODE_ENV !== 'production') {
    return setDisplayName(wrapDisplayName(BaseComponent, name))(Comp)
  }
  return Comp
}

export default (mapState, mapDispatch, ...rest) => {
  let _mapState = mapState
  if (mapState) {
    _mapState = (initState, initProps) => {
      // assume store won't change
      const store = initProps.store
      const context = store.context
      const wrappedMapState = (state, props) => {
        context.duringMapState = true
        const newProps = mapState(store, props, state)
        // always set back to normal mode, if some find / queries set as serverPreloading
        context.serverPreloading = false
        context.duringMapState = false
        return newProps
      }
      return mapState.length > 1 ? wrappedMapState : () => wrappedMapState()
    }
  }

  let _mapDispatch = mapDispatch
  if (mapDispatch) {
    _mapDispatch = (initDispatch, initProps) => {
      const store = initProps.store
      const wrappedMapDispatch = (dispatch, props) => mapDispatch(store, props, dispatch)
      return mapDispatch.length > 1 ? wrappedMapDispatch : () => wrappedMapDispatch()
    }
  }

  return compose(getContext({ store: PropTypes.object.isRequired }), connect(_mapState, _mapDispatch, ...rest))
}

export const withCollections = defineHoc(
  'withCollections',
  (factory, definitions) =>
    class WithCollections extends React.Component {
      static contextTypes = { store: PropTypes.object.isRequired }
      constructor(props, context) {
        super(props, context)
        ensureCollections(this.context.store, definitions)
      }
      render() {
        return factory(this.props)
      }
    }
)
