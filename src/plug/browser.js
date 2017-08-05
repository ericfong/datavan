function ensureListener(self, listenerKey, addListenerFunc) {
  if (self[listenerKey]) return
  self[listenerKey] = true
  addListenerFunc(self)
}

function addOnResize(self) {
  if (global.window) {
    window.addEventListener('resize', () => {
      self.onSetAll({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    })
    self.onSetAll({
      width: window.innerWidth,
      height: window.innerHeight,
    })
  } else {
    // default value for node
    self.onSetAll({
      width: 360,
      height: 640,
    })
  }
}

export default {
  getWidth() {
    ensureListener(this, 'resize', addOnResize)
    return this.get('width')
  },
  getHeight() {
    ensureListener(this, 'resize', addOnResize)
    return this.get('width')
  },
}
