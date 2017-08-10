import { GET_DATAVAN } from './enhancer'
import { define } from './Collection'

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }

function getDv(host) {
  // host = dispatch
  if (typeof host === 'function') return host(GET_DATAVAN_ACTION)

  // host = state
  const datavan = host.datavan
  if (datavan) return datavan.get()

  // host = collection | store
  const dv = host.dv
  if (dv) return dv

  // host = dv
  return host
}

export function getCollection(host, name) {
  return getDv(host).getCollection(name)
}

export default function defineCollection(name, plug, dependencies) {
  // gen uniq id to prevent use same global namespace
  const uniqId = Math.random()
  const definition = define({ name, uniqId }, plug)
  return host => getDv(host).getCollection(name, { uniqId, definition, dependencies })
}
