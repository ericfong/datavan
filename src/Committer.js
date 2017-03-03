import _ from 'lodash'

import KeyValueStore from './KeyValueStore'


export const mixinRedirecter = (target) => Base => {
  return class Redirecter extends Base {
    getRequires = () => ({target})
    mutate(mutation) {
      super.mutate(mutation)
      this.target.addSliceMutate(this.name, mutation)
    }
  }
}


// function createSideMutator(baseFunc, mutator) {
//   return function sideLoader(mutation) {
//     mutator.call(this, mutation)
//     .then(ret => {
//       const currState = this.getState()
//       const allSlicesMutation = {}
//
//       // unset local data that being removed by server
//       const newArray = _.without(currState, ...mutation)
//       _.set(allSlicesMutation, [this.name, sliceName], {$set: newArray})
//
//       // internal set the new docs
//       const sliceMutation = allSlicesMutation[sliceName] = _.mapValues(sliceRet, v => ({$set: v}))
//
//       // process deleted or moved from server to client
//       const committedKeys = _.flatten(_.map(commitData[sliceName], mutation => _.keys(mutation)))
//       const noRet = _.without(committedKeys, ..._.keys(sliceRet))
//       // console.log('>>> ||', noRet, committedKeys, _.keys(sliceRet))
//       _.each(noRet, id => {
//         sliceMutation[id] = {$set: undefined}
//       })
//
//       // console.log('>>> ', allSlicesMutation.users)
//       this.mutateStoreState(allSlicesMutation)
//       return ret
//     })
//     .catch(err => {
//       // ECONNREFUSED = Cannot reach server
//       // Not Found = api is too old
//       if (!(err.code === 'ECONNREFUSED' || err.message === 'Not Found' || err.response)) {
//         console.error(err)
//       }
//       return err instanceof Error ? err : new Error(err)
//     })
//
//     return baseFunc.call(this, mutation)
//   }
// }


const Committer = (doCommit, {autoCommit = true} = {}) => class Committer extends KeyValueStore {
  autoCommit = autoCommit

  addSliceMutate(sliceName, mutation) {
    if (this.get(sliceName)) {
      this.mutateState({ [sliceName]: {$push: [mutation]} })
    } else {
      this.mutateState({ [sliceName]: {$set: [mutation]} })
    }
    if (this.autoCommit) this.commit()
  }

  _committerPromise = null

  commit() {
    if (this._committerPromise) return this._committerPromise

    const commitData = this.getState()
    if (!commitData) return Promise.resolve()

    return this._committerPromise = doCommit(commitData)
    .then(ret => {
      const currState = this.getState()
      const allSlicesMutation = {}
      _.each(ret, (sliceRet, sliceName) => {
        // unset mutation array
        const newArray = _.without(currState[sliceName], ...commitData[sliceName])
        _.set(allSlicesMutation, [this.name, sliceName], {$set: newArray})

        // internal set the new docs
        const sliceMutation = allSlicesMutation[sliceName] = _.mapValues(sliceRet, v => ({$set: v}))

        // process deleted or moved from server to client
        const committedKeys = _.flatten(_.map(commitData[sliceName], mutation => _.keys(mutation)))
        const noRet = _.without(committedKeys, ..._.keys(sliceRet))
        // console.log('>>> ||', noRet, committedKeys, _.keys(sliceRet))
        _.each(noRet, id => {
          sliceMutation[id] = {$set: undefined}
        })
      })
      // console.log('>>> ', allSlicesMutation.users)
      this.mutateStoreState(allSlicesMutation)
      return ret
    })
    .catch(err => {
      // ECONNREFUSED = Cannot reach server
      // Not Found = api is too old
      if (!(err.code === 'ECONNREFUSED' || err.message === 'Not Found' || err.response)) {
        console.error(err)
      }
      return err instanceof Error ? err : new Error(err)
    })
    .then(ret => {
      this._committerPromise = null
      // ret.flushData = flushData
      return ret
    })
  }

  getPromise() {
    const promises = _.compact([super.getPromise && super.getPromise(), this._committerPromise])
    return promises.length > 0 ? Promise.all(promises) : null
  }
}
export default Committer
