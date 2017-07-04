import PropTypes from 'prop-types'
import getContext from 'recompose/getContext'
// use redux's compose if not using recompose/getContext
import compose from 'recompose/compose'
import { connect } from 'react-redux'

export default (mapState, mapDispatch, ...rest) => {
  let _mapState = mapState
  if (mapState) {
    _mapState = (state, ownProps) => {
      const store = ownProps.store
      const context = store.context
      context.duringMapState = true

      const props = mapState(store, ownProps, state)

      // always set back to normal mode, if some find / queries set as serverPreloading
      context.serverPreloading = false
      context.duringMapState = false
      return props
    }
  }

  let _mapDispatch = mapDispatch
  if (mapDispatch) {
    _mapDispatch = (dispatch, ownProps) => mapDispatch(ownProps.store, ownProps, dispatch)
  }

  return compose(getContext({ store: PropTypes.object.isRequired }), connect(_mapState, _mapDispatch, ...rest))
}
