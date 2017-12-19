import _ from 'lodash'

// Deprecated: getSetters() will be deprecated soon
export default function getSetters(...ids) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('getSetters() will be deprecated soon')
  }
  const obj = {}
  _.each(ids, id => {
    obj[_.camelCase(`get-${id}`)] = function fieldGetter(option) {
      return this.get(id, option)
    }
    obj[_.camelCase(`set-${id}`)] = function fieldSetter(value, option) {
      return this.set(id, value, option)
    }
  })
  return obj
}
