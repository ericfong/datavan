import _ from 'lodash'


function isExportMethod(name, value) {
  return name[0] !== '_' && name !== 'constructor' && typeof value === 'function'
}
function extractExportMethods(obj, methods = {}) {
  _.each(Object.getOwnPropertyNames(obj), name => {
    const value = obj[name]
    if (isExportMethod(name, value) && !methods[name]) {
      methods[name] = value
    }
  })
  return methods
}
function getClassMethodsDeep(Class, methods = {}) {
  while (Class && !Class.isPrototypeOf(Object)) {
    extractExportMethods(Class.prototype, methods)
    Class = Object.getPrototypeOf(Class)
  }
  return methods
}
function getObjectMethodsDeep(obj, methods = {}) {
  extractExportMethods(obj, methods)
  getClassMethodsDeep(Object.getPrototypeOf(obj), methods)
  return methods
}
function convertObjectToMixin(mixin) {
  return Base => {
    // convert object to mixin
    const props = {}
    const Class = class extends Base {
      constructor(...args) {
        super(...args)
        Object.assign(this, props)
      }
    }
    if (_.isPlainObject(mixin)) {
      _.each(mixin, (v, k) => {
        if (typeof v === 'function') {
          Class.prototype[k] = v
        } else if (k !== 'requires') {
          props[k] = v
        }
      })
    } else {
      _.assign(Class.prototype, getObjectMethodsDeep(mixin))
    }
    return Class
  }
}

export function isClass(Class) {
  if (typeof Class !== 'function') return false

  const SuperClass = Object.getPrototypeOf(Class)
  if (!SuperClass.isPrototypeOf(Object)) return true

  const methods = _.without(Object.getOwnPropertyNames(Class.prototype), 'constructor')
  return methods.length > 0
}

// Mixin = A function "with a superclass as input and a subclass extending that superclass as output"
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Classes
export function composeClass(...array) {
  const mixins = _.compact(_.flattenDeep(array))

  if (mixins.length === 0) return class {}
  if (mixins.length === 1) return mixins[0]

  const Accumulator = mixins[0]
  if (typeof Accumulator === 'object') {
    mixins[0] = convertObjectToMixin(Accumulator)
  } else if (isClass(Accumulator)) {
    return Accumulator
  }

  return mixins.reduce((Accumulator, mixin) => {
    if (typeof mixin === 'object') {
      mixin = convertObjectToMixin(mixin)
    } else if (isClass(mixin)) {
      // ignore Base and directly return mixin because it is class
      return function() {
        return Accumulator(mixin)
      }
    }

    return function(Base) {
      // mixin = "with a superclass as input and a subclass extending that superclass as output"
      return Accumulator(mixin(Base))
    }
  })()
}



export function genGetSetters(properties) {
  const obj = {}
  _.each(properties, (conf, id) => {
    obj[_.camelCase('get-' + id)] = function(option) {
      return this.get(id, option)
    }

    if (conf.set !== false && conf.writable !== false) {
      obj[_.camelCase('set-' + id)] = function(value) {
        return this.setState({ [id]: value })
      }
    }
  })
  return obj
}


export const mixinAccessor = (properties) => Base => {
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
    genGetSetters(properties)
  )
  return Accessor
}
