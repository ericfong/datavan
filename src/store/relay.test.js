import _ from 'lodash'
import { createStore } from 'redux'
import delay from 'delay'

import { datavanEnhancer, defineCollection, relayFetcher, getCollection, load } from '..'
import onFetchEcho from '../test/onFetchEcho'

class FakeChannel {
  list = []
  postMessage = data => {
    this.list.push(JSON.stringify(data))
    this._emit()
  }
  _emit = _.debounce(() => {
    try {
      const { list, listener } = this
      _.each(list, item => listener({ data: JSON.parse(item) }))
    } catch (err) {
      console.error(err)
    }
  })
  addEventListener(listener) {
    this.listener = listener
  }
}

function handleRelay(store, relay) {
  const collection = getCollection(store, { name: relay.name })
  // findAsync
  return collection[relay.action](relay.query, relay.option).then(ret => {
    relay.result = ret
    return relay
  })
}

function handleRelayResponse(store, relay) {
  const collection = getCollection(store, { name: relay.name })
  load(collection, relay.result)
  // console.log('back', collection.name, relay.result, collection.getAll())
}

test('basic', async () => {
  const Roles = defineCollection({ name: 'roles', idField: 'name' })
  const Blogs = defineCollection({ name: 'blogs' })
  const Users = defineCollection({ name: 'users' })

  const serviceWorkerChannel = new FakeChannel()
  const feedbackChannel = new FakeChannel()

  const winStore = createStore(
    null,
    null,
    datavanEnhancer({
      overrides: {
        roles: relayFetcher(serviceWorkerChannel.postMessage),
        blogs: relayFetcher(serviceWorkerChannel.postMessage),
        users: relayFetcher(serviceWorkerChannel.postMessage),
      },
    })
  )
  feedbackChannel.addEventListener(event => {
    handleRelayResponse(winStore, event.data)
  })

  // service-worker
  const swStore = createStore(
    null,
    null,
    datavanEnhancer({
      overrides: {
        roles: { onFetch: onFetchEcho },
        blogs: { onFetch: onFetchEcho },
        users: { onFetch: onFetchEcho },
      },
    })
  )
  // persist swStore instead of winStore
  serviceWorkerChannel.addEventListener(event => {
    // post message to service-worker
    handleRelay(swStore, event.data).then(relay => feedbackChannel.postMessage(relay))
  })

  expect(Roles(winStore).find(['ADMIN', 'READER'])).toEqual([])

  // wait for post and back
  await delay(60)

  // after post back and come, can get data
  expect(Roles(winStore).find(['ADMIN', 'READER'])).toEqual([{ _id: 'ADMIN', name: 'ADMIN' }, { _id: 'READER', name: 'READER' }])
})
