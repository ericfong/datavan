import { getDv } from './enhancer'
import { define } from './Collection'

export function getCollection(host, name) {
  return getDv(host).getCollection(name)
}

export default function defineCollection(name, plug, dependencies) {
  // gen uniq id to prevent use same global namespace
  const uniqId = Math.random()
  const definition = define({ name, uniqId }, plug)
  return host => getDv(host).getCollection(name, { uniqId, definition, dependencies })
}
