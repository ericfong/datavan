import _ from 'lodash'

const createCollection = (vanProto, name, { dispatch, getState }) => {
  return {
    ...vanProto,

    name,
    idField: '_id',

    mutateData(...args) {
      dispatch({ type: 'mutateData', args: [name, ...args] })
    },
    mutate(...args) {
      this.mutateData('submits', ...args)
    },
    set(...args) {
      const last = args.length - 1
      args[last] = { $set: args[last] }
      this.mutate(...args)
    },

    getById() {
      return this.submits
    },
    getAll() {
      return this.getById()
    },

    genId() {
      // return genTmpId(state)
    },
  }
}

const createDb = (vanProtos, store) => {
  const firstState = store.getState()
  _.each(vanProtos, (vanProto, name) => {
    firstState[name] = Object.assign(
      _.defaults(firstState[name], {
        submits: {},
        originals: {},
        preloads: {},
        fetchAts: {},
        fetchingAt: null,
        cache: {},
      }),
      createCollection(vanProto, name, store)
    )
  })
  firstState.dispatch = store.dispatch
  return firstState
}

export default createDb
