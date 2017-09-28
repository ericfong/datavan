export function getAll(self) {
  return self.getAll()
}

export function get(self, id, option = {}) {
  return self.get(id, option)
}

export function find(self, query, option) {
  return self.find(query, option)
}

export function findAsync(self, query = {}, option = {}) {
  return self.findAsync(query, option)
}
