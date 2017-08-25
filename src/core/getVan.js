import { GET_DATAVAN, STATE_NAMESPACE } from '../enhancer'

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }

export default function getVan(stateOrDispatch) {
  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') return stateOrDispatch(GET_DATAVAN_ACTION)

  // stateOrDispatch = state
  const datavanState = stateOrDispatch[STATE_NAMESPACE]
  if (datavanState) return datavanState.get()

  // stateOrDispatch = collection | store
  const dv = stateOrDispatch.dv
  if (dv) return dv

  // stateOrDispatch = dv
  return stateOrDispatch
}
