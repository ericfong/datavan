import KeyValueStore from './KeyValueStore'

export default class Browser extends KeyValueStore {
  preloadStoreState(preloadedState) {
    let preload
    if (global.window) {
      preload = {
        width: window.innerWidth,
        height: window.innerHeight,
      }
      window.addEventListener('resize', this._onResize)
    } else {
      preload = {
        width: 360,
        height: 640,
      }
    }
    preloadedState[this.name] = preload
  }

  _onResize = () => {
    this.setAll({
      width: window.innerWidth,
      height: window.innerHeight,
    })
  }

  getWidth() {
    return this.get('width')
  }

  getHeight() {
    return this.get('height')
  }
}
