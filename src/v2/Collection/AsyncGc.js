export default class FetchingCollection {
  // gcTime = 60 * 1000
  gcTime = -1
  _gcAt = 0
  _shouldRunGc = false

  _invalidateForGc() {
    if (this.gcTime < 0) return false
    const expire = Date.now() - this.gcTime
    if (this._gcAt > expire) return false
    this._gcAt = Date.now()
    this._fetchAts = _.pickBy(this._fetchAts, fetchAt => fetchAt > expire)
    this._shouldRunGc = true
    return true
  }

  _gc() {
    if (!this.onFetch || !this._shouldRunGc) return
    this._shouldRunGc = false

    const state = this.state
    const _fetchAts = this._fetchAts
    const shouldKeep = (v, key) => {
      const keep = this.isDirty(key) || _fetchAts[key]
      // if (!keep) console.log('gc', this.name, key)
      return keep
    }
    state.byId = _.pickBy(state.byId, shouldKeep)
    state.requests = _.pickBy(state.requests, shouldKeep)
  }
}
