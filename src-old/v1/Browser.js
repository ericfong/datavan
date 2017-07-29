import KeyValueStore from './KeyValueStore'

function ensureListener(self, listenerKey, addListenerFunc) {
  if (self[listenerKey]) return
  self[listenerKey] = true
  const initValues = addListenerFunc(self)
  if (initValues) {
    self.mutateState({ byId: initValues })
  }
}

function addOnResize(self) {
  if (global.window) {
    window.addEventListener('resize', () => {
      self.setAll({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    })
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  // default value for node
  return {
    width: 360,
    height: 640,
  }
}

export function getBrowserWidth() {
  ensureListener(this, 'resize', addOnResize)
  return this.get('width')
}

export function getBrowserHeight() {
  ensureListener(this, 'resize', addOnResize)
  return this.get('width')
}

export default class Browser extends KeyValueStore {}

Browser.prototype.getWidth = getBrowserWidth
Browser.prototype.getHeight = getBrowserHeight
