export function fetchIdInQuery(idField, query, func) {
  const id = query[idField]
  return { [id]: func(id) }
}
