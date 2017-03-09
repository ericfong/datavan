import KeyValueStore from './KeyValueStore'
import {genGetSetters} from './util/classUtil'


export default class Browser extends KeyValueStore {
  preloadStoreState(preloadedState) {
    if (global.window) {
      preloadedState[this.name] = {
        width: window.innerWidth,
        height: window.innerHeight,
      }
    }
  }

  _onResize = () => {
    this.setState({
      width: window.innerWidth,
      height: window.innerHeight,
    })
  }

  get(id) {
    if (id === 'height' || id === 'width') {
      if (!this._onResizeWatching) {
        this._onResizeWatching = {}
        window.addEventListener('resize', this._onResize)
      }
      return super.get(id) || 0
    }
    return super.get(id)
  }

  // onUnwatch(key) {
  //   if (key === 'height' || key === 'width') {
  //     const _onResizeWatching = this._onResizeWatching
  //     _.unset(_onResizeWatching, key)
  //     if (!_onResizeWatching.height && !_onResizeWatching.width) {
  //       delete this._onResizeWatching
  //       window.removeEventListener('resize', this._onResize)
  //     }
  //   }
  // }
}

Object.assign(
  Browser.prototype,
  genGetSetters({
    width: {writable: false},
    height: {writable: false},
  })
)
