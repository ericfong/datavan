import { load } from '../collection/load'
import { get } from '../collection/find'
import { dispatchMutations, getCollection } from '../store'

function ensureListener(self, listenerKey, addListenerFunc) {
  if (self[listenerKey]) return
  self[listenerKey] = true
  addListenerFunc(self)
}

function loadWidthHeight(coll, width, height) {
  const byId = {}
  if (coll._browserWidthKey) byId[coll._browserWidthKey] = width
  if (coll._browserHeightKey) byId[coll._browserHeightKey] = height
  load(coll, { byId })
}

function addOnResize(coll) {
  if (global.window) {
    const onResize = () => {
      loadWidthHeight(coll, window.innerWidth, window.innerHeight)
      dispatchMutations(coll.store)
    }
    window.addEventListener('resize', onResize)
    onResize()
  } else {
    // default value for node
    loadWidthHeight(coll, 360, 640)
  }
}

export function getBrowserWidth(state, collectionName, widthKey = 'browserWidth') {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('getBrowserWidth is deprecating! Please use css or your own UI library to achieve same result')
  }
  const coll = getCollection(state, collectionName)
  coll._browserWidthKey = widthKey
  ensureListener(coll, '_browserOnResize', addOnResize)
  return get(coll, widthKey)
}

export function getBrowserHeight(state, collectionName, heightKey = 'browserHeight') {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('getBrowserHeight is deprecating! Please use css or your own UI library to achieve same result')
  }
  const coll = getCollection(state, collectionName)
  coll._browserHeightKey = heightKey
  ensureListener(coll, '_browserOnResize', addOnResize)
  return get(coll, heightKey)
}
