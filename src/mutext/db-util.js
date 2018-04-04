import createDb from './db'

export const forkDb = parentDb => {
  return createDb(parentDb)
}
