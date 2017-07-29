import _ from 'lodash'


function genPropFuncs(properties) {
  const obj = {}
  _.each(properties, (conf, id) => {
    obj[id] = function(value, option) {
      if (value === undefined) {
        return this.get(id, option)
      }
      if (conf.set === false || conf.writable === false) {
        throw new Error(`Cannot set or write ${id}`)
      }
      return this.setState({ [id]: value })
    }
  })
  return obj
}


export default (properties) => Base => {
  class Accessor extends Base {
    preloadStoreState(preloadedState) {
      if (super.preloadStoreState) super.preloadStoreState(preloadedState)

      const targetState = preloadedState[this.name]
      _.each(properties, (conf, id) => {
        if (conf.value !== undefined && !targetState[id]) {
          targetState[id] = conf.value
        }
      })
    }
  }
  Object.assign(
    Accessor.prototype,
    genPropFuncs(properties)
  )
  return Accessor
}
