import { get } from '../collection/find'
import { mutate } from '../collection/setter'

export default function getSetter(collName, id) {
  return {
    get: state => get(state, collName, id),
    set: (dispatch, value) => mutate(dispatch, collName, id, value),
  }
}
