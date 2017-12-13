import { createStore } from 'redux'
import { datavanEnhancer, getCollection } from '..'

export default function createCollection(spec) {
  const name = spec.name || 'users'
  const collections = { [name]: spec }
  const store = createStore(s => s, {}, datavanEnhancer({ collections }))
  return getCollection(store, name)
}
