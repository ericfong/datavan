import { find, findAsync } from './find'

export function findOne(core, query, option) {
  return find(core, query, { ...option, limit: 1 })[0]
}

const _first = arr => arr[0]
export function getAsync(core, id, option = {}) {
  return findAsync(core, [id], option).then(_first)
}

export function allPendings(core) {
  return Object.values(core._fetchingPromises)
}
