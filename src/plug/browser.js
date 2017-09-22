import { setAll } from '../collection/setter'

function ensureListener(self, listenerKey, addListenerFunc) {
  if (self[listenerKey]) return
  self[listenerKey] = true
  addListenerFunc(self)
}

function addOnResize(self) {
  if (global.window) {
    window.addEventListener('resize', () => {
      setAll(self, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
    })
    setAll(self, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
  } else {
    // default value for node
    setAll(self, {
      width: 360,
      height: 640,
    })
  }
}

export default spec =>
  Object.assign({}, spec, {
    getWidth() {
      ensureListener(this, 'resize', addOnResize)
      return this.get('width')
    },
    getHeight() {
      ensureListener(this, 'resize', addOnResize)
      return this.get('width')
    },
  })
