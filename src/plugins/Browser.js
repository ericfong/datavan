function ensureListener(self, listenerKey, addListenerFunc) {
  if (self[listenerKey]) return
  self[listenerKey] = true
  addListenerFunc(self)
}

function addOnResize(self) {
  if (global.window) {
    window.addEventListener('resize', () => {
      self.setData({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    })
    self.setData({
      width: window.innerWidth,
      height: window.innerHeight,
    })
  }
  // default value for node
  self.setData({
    width: 360,
    height: 640,
  })
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
