import _ from 'lodash'

// design for memorizeConnect
// BUG: change on state won't trigger re-run
// may be bug in datavan?
export const makeDebouncePreparer = ({ inputKey, confirmKey, wait = 400 }) => func => {
  let memInput
  let memConfirmedInput
  let lastArgument
  let lastState

  const _debounced = _.debounce(input => {
    memInput = input
    // trigger datavan run after debounced
    lastArgument[inputKey] = memInput
    func.call(null, lastState, lastArgument)
  }, wait)

  return (argument, state) => {
    const input = argument[inputKey]
    const confirmedInput = argument[confirmKey]

    if (input !== memInput) {
      if (memInput === undefined) {
        // first run
        memInput = input
      } else {
        _debounced(input)
      }
    }

    if (confirmedInput !== memConfirmedInput) {
      memConfirmedInput = confirmedInput
      // NOTE input should always be the newest, memConfirmedInput only for reference for confirmed change
      memInput = input
    }

    // mutate
    argument[inputKey] = memInput
    lastArgument = argument
    lastState = state
  }
}

// Better to debounce prop in hoc instead of general function, which don't need to think about function async or function running scope problem

// design for connect
// Not good as need to create debouncer in connect(init return method) which is hard to read
// want to have a props or state to pass down to func
export function debounceInput(func, wait, options) {
  let memInput
  let memConfirmedInput
  let lastProps

  const _debounced = _.debounce(
    input => {
      memInput = input
      // trigger datavan run after debounced
      func(lastProps, memInput)
    },
    wait,
    options
  )

  return (props, input, confirmedInput) => {
    if (input !== memInput) {
      if (memInput === undefined) {
        // first run
        memInput = input
      } else {
        _debounced(input)
      }
    }

    if (confirmedInput !== memConfirmedInput) {
      memConfirmedInput = confirmedInput
      // NOTE input should always be the newest, memConfirmedInput only for reference for confirmed change
      memInput = input
    }

    lastProps = props

    return func(props, memInput)
  }
}

// design for general usage
// convert a sync or async function, to debounce first argument, and always sync return memorizedResult
export function debounceMemoize(func, options) {
  const { wait } = options || {}
  let memorizedInput
  let memorizedResult
  let runningPromise

  const runNow = input => {
    if (input === memorizedInput) return

    const ret = func(input)
    if (ret.then) {
      runningPromise = ret
      ret.then(result => {
        if (ret !== runningPromise) return
        runningPromise = null
        memorizedResult = result
      })
    } else {
      runningPromise = null
      memorizedResult = ret
    }
  }

  const _debounced = _.debounce(runNow, wait, options)

  const debounced = input => {
    _debounced(input)
    return memorizedResult
  }

  debounced.runNow = runNow

  return debounced
}
