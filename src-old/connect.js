import PropTypes from 'prop-types'
import getContext from 'recompose/getContext'
import compose from 'recompose/compose'
import { connect } from 'react-redux'

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
