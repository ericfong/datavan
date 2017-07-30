import _ from 'lodash'

function getOwnPropertyNames(obj) {
  return obj ? Object.getOwnPropertyNames(obj) : null
}

// NOTE less recursive code
// function isExportMethod(name, value) {
//   return name[0] !== '_' && name !== 'constructor' && typeof value === 'function'
// }
// function extractExportMethods(obj, methods = {}) {
//   _.each(getOwnPropertyNames(obj), name => {
//     const value = obj[name]
//     if (isExportMethod(name, value) && !methods[name]) {
//       methods[name] = value
//     }
//   })
//   return methods
// }
// function getClassMethodsDeep(Class, methods = {}) {
//   // eslint-disable-next-line
//   while (Class && !Class.isPrototypeOf(Object)) {
//     extractExportMethods(Class.prototype, methods)
//     Class = Object.getPrototypeOf(Class)
//   }
//   return methods
// }
// function getObjectMethodsDeep(obj, methods = {}) {
//   extractExportMethods(obj, methods)
//   getClassMethodsDeep(Object.getPrototypeOf(obj), methods)
//   return methods
// }
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
    // if (_.isPlainObject(mixin)) {
    //   _.each(...)
    // } else {
    //   _.assign(Class.prototype, getObjectMethodsDeep(mixin))
    // }
    _.each(mixin, (v, k) => {
      if (typeof v === 'function') {
        Class.prototype[k] = v
      } else {
        props[k] = v
      }
    })
    return Class
  }
}

export function isClass(Class) {
  if (typeof Class !== 'function') return false

  const SuperClass = Object.getPrototypeOf(Class)
  // eslint-disable-next-line
  if (!SuperClass.isPrototypeOf(Object)) return true

  const methods = _.without(getOwnPropertyNames(Class.prototype), 'constructor')
  return methods.length > 0
}

// Mixin = A function "with a superclass as input and a subclass extending that superclass as output"
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Classes
export function composeClass(...array) {
  const mixins = _.compact(_.flattenDeep(array))

  if (mixins.length === 0) return class {}
  if (mixins.length === 1) return mixins[0]

  const Accumulator = mixins[0]
  if (isClass(Accumulator)) {
    return Accumulator
  }

  // NOTE mixin = "with a superclass as input and a subclass extending that superclass as output"

  // Array.reduce will take first item as accumulator
  if (typeof Accumulator === 'object') {
    mixins[0] = convertObjectToMixin(Accumulator)
  }

  return mixins.reduce((accumulator, mixin) => {
    if (typeof mixin === 'object') {
      mixin = convertObjectToMixin(mixin)
    } else if (isClass(mixin)) {
      // ignore Base and directly return mixin because it is class
      return () => accumulator(mixin)
    }

    // return new mixin = current accumulator + current mixin
    return Base => accumulator(mixin(Base))
  })()
  // finally run all accumulated function with Base argument as undefined / Object
}

export function getSetters(...ids) {
  const obj = {}
  _.each(ids, id => {
    obj[_.camelCase(`get-${id}`)] = function fieldGetter(option) {
      return this.get(id, option)
    }
    obj[_.camelCase(`set-${id}`)] = function fieldSetter(value) {
      return this.set(id, value)
    }
  })
  return obj
}
