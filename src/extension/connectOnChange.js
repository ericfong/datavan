import _ from 'lodash'
import { connect } from 'react-redux'
import { shallowEqual } from 'recompose'

const getArr = arg => {
  if (arg === '*') return '*'
  let ret
  if (typeof arg === 'string') ret = _.uniq(_.compact(arg.split(',').map(_.trim)))
  return ret || []
}

const pickKeys = (props, keys) => (keys === '*' ? props : _.pick(props, keys))

export default (collectionStr, propStr, mapState) => {
  const collKeys = getArr(collectionStr)
  const propKeys = getArr(propStr)

  return connect(() => {
    // init per component
    let currProps
    let currByIds
    let currResult

    // real mapState
    return (state, props) => {
      const nextByIds = _.mapValues(pickKeys(state.datavan, collKeys), 'byId')
      const nextProps = pickKeys(props, propKeys)
      if (shallowEqual(nextByIds, currByIds) && shallowEqual(nextProps, currProps)) return currResult

      currByIds = nextByIds
      currProps = nextProps
      currResult = mapState(state, props)
      return currResult
    }
  })
}
