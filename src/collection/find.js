import findInMemory from './findInMemory'

export function find(self, query = {}, option = {}) {
  if (self.checkFetch) self.checkFetch(self, query, option)
  return findInMemory(self, query, option)
}

export function findAsync(self, query = {}, option = {}) {
  return Promise.resolve(self.checkFetch(self, query, option, true)).then(() => findInMemory(self, query, option))
}

export function get(self, id, option = {}) {
  if (self.checkFetch) self.checkFetch(self, [id], option)
  return self.onGet(id, option)
}
