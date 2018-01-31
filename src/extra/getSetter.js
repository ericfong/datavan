import { _get } from '../collection/getter'
import { mutate } from '../collection/setter'

export default function getSetter(collName, id) {
  return {
    get: state => _get(state, collName, id),
    set: (dispatch, value) => mutate(dispatch, collName, id, value),
  }
}
