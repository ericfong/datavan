import _ from 'lodash'
import { connect } from 'react-redux'
import { shallowEqual } from 'recompose'

const arrayMapValues = (collections, fn) =>
  _.reduce(
    collections,
    (ret, key) => {
      ret[key] = fn(key)
      return ret
    },
    {},
  )

export default (collectionStr, propStr, mapState) => {
  const collectionNames = collectionStr.split(',').map(_.trim)
  const propKeys = propStr.split(',').map(_.trim)

  return connect(() => {
    // init per component
    let currProps
    let currByIds
    let currResult

    // real mapState
    return (state, props) => {
      const stateDv = state.datavan
      const nextByIds = arrayMapValues(collectionNames, name => stateDv[name].byId)

      const nextProps = _.pick(props, propKeys)
      if (shallowEqual(nextByIds, currByIds) && shallowEqual(nextProps, currProps)) return currResult

      currByIds = nextByIds
      currProps = nextProps
      currResult = mapState(state, props)
      return currResult
    }
  })
}
