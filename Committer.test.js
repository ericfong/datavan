import _ from 'lodash'
import should from 'should'

import {composeClass} from '.'
import {defineCollections} from '.'
import Collection from './Collection'
import committer, {mixinRedirecter} from './Committer'


describe('Committer', function() {
  it('basic', async () => {
    let lastCommitData

    const createStore = defineCollections({
      users: composeClass(
        mixinRedirecter('committer'),
        Collection,
      ),
      committer: committer(async commitData => {
        // console.log('>> commitData', commitData)
        lastCommitData = commitData
        return _.mapValues(commitData, sliceMutates => {
          const sliceMutateTable = _.assign({}, ...sliceMutates)
          const newDocs = _.mapValues(sliceMutateTable, mutate => ({
            ...mutate.$set,
            oldId: mutate.$set._id,
            _id: 'realId',
          }))
          // update by realIds
          return _.keyBy(newDocs, '_id')
        })
      }),
    })
    const db = createStore()

    db.users.set('tmpId', {_id: 'tmpId', name: 'Eric'})
    should( lastCommitData ).deepEqual({
      users: [
        {
          tmpId: {
            $set: {_id: 'tmpId', name: 'Eric'},
          },
        },
      ],
    })

    await db.getPromise()
    should( db.committer.get('users') ).deepEqual([])
    should( db.users.getState() ).deepEqual({
      tmpId: undefined,
      realId: { _id: 'realId', name: 'Eric', oldId: 'tmpId' },
    })
  })
})
