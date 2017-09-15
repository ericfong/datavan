import { connect } from 'react-redux'
import { shallowEqual } from 'recompose'

function createMemoize(func, preparer) {
  let lastArg = null
  let lastResult = null

  const prepare = preparer ? preparer(func) : false

  function memoizer(state, argument) {
    if (prepare) prepare(argument, state)

    if (!shallowEqual(argument, lastArg)) {
      // apply arguments instead of spreading for performance.
      lastResult = func.call(null, state, argument)
    }

    lastArg = argument
    return lastResult
  }

  memoizer.func = func
  return memoizer
}

export default function memorizeConnect(mapState, ...connectArgs) {
  const _mapState = mapState
    ? () => {
      // init for connected react component
      const memoizerArr = []

      // Component instance based memorizer
      let i = 0
      function getOrCreateMemoize(func, preparer) {
        let memoizer = memoizerArr[i]
        if (!memoizer || memoizer.func !== func) {
          memoizer = memoizerArr[i] = createMemoize(func, preparer)
        }
        i++
        return memoizer
      }

      // provide memorize to mapState
      // TODO consider mapState without require props, which can optimize redux-connect
      return (state, props) => {
        i = 0

        const memorize = (func, argument, preparer) => getOrCreateMemoize(func, preparer)(state, argument)

        return mapState(memorize, state, props)
      }
    }
    : null
  return connect(_mapState, ...connectArgs)
}
