import createDb from './db'

export const forkDb = parentDb => createDb(parentDb)
