import _ from 'lodash'

export default function getSetters(...ids) {
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
