import { load } from '../collection/load'
import { get } from '../collection/base'
import { dispatchMutations } from '../store-base'

function ensureListener(self, listenerKey, addListenerFunc) {
  if (self[listenerKey]) return
  self[listenerKey] = true
  addListenerFunc(self)
}

function addOnResize(self) {
  if (global.window) {
    const onResize = () => {
      load(self, {
        byId: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      })
      dispatchMutations(self.store)
    }
    window.addEventListener('resize', onResize)
    onResize()
  } else {
    // default value for node
    load(self, {
      byId: {
        width: 360,
        height: 640,
      },
    })
  }
}

export default spec =>
  Object.assign({}, spec, {
    getWidth() {
      ensureListener(this, 'resize', addOnResize)
      return get(this, 'width')
    },
    getHeight() {
      ensureListener(this, 'resize', addOnResize)
      return get(this, 'height')
    },
  })
