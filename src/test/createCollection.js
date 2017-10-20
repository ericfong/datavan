import { createStore } from 'redux'
import { datavanEnhancer, defineCollection } from '..'

export default function createCollection(spec) {
  const Collection = defineCollection({ ...spec, name: spec.name || 'users' })
  const store = createStore(null, null, datavanEnhancer())
  return Collection(store)
}
