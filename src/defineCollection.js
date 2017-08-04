import { getDv } from './enhancer'

export function getCollection(host, name) {
  return getDv(host).getCollection(name)
}

export default function defineCollection(name, definition, dependencies) {
  // gen uniq id to prevent use same global namespace
  const uniqId = Math.random()
  return host => getDv(host).getCollection(name, { uniqId, definition, dependencies })
}
