import _ from 'lodash'
import { createStore } from 'redux'
import delay from 'delay'

import { datavanEnhancer, defineCollection, relayFetcher, getCollection, set, relayWorker } from '..'
import { EchoDB } from '../test/echo'

class FakeChannel {
  list = []
  postMessage = data => {
    this.list.push(JSON.stringify(data))
    this._emit()
  }
  _emit = _.debounce(() => {
    try {
      const { list, listener } = this
      this.list = []
      _.each(list, item => listener({ data: JSON.parse(item) }))
    } catch (err) {
      console.error('FakeChannel Error:', err.stack)
    }
  })
  addEventListener(listener) {
    this.listener = listener
  }
}

function handleRelay(store, relay) {
  const collection = getCollection(store, { name: relay.name })
  // relay.action = 'findAsync' | 'setAll'
  return Promise.resolve(collection[relay.action](relay.args[0], relay.args[1])).then(ret => {
    // console.log('handleRelay', relay.action, relay.name, relay.args[0], ret)
    relay.result = ret
    return relay
  })
}

test('basic', async () => {
  const Roles = defineCollection({ name: 'roles', idField: 'name' })
  const Blogs = defineCollection({ name: 'blogs' })
  const Users = defineCollection({ name: 'users' })

  const serviceWorkerChannel = new FakeChannel()
  const feedbackChannel = new FakeChannel()

  // should use one relay for similar collections
  const relay = relayFetcher(serviceWorkerChannel.postMessage)
  feedbackChannel.addEventListener(event => relay.reportRequest(event.data))

  const winStore = createStore(
    null,
    null,
    datavanEnhancer({
      overrides: {
        roles: relay,
        blogs: relay,
        users: relay,
      },
    })
  )

  // service-worker
  const db = new EchoDB()
  const workerSubmit = jest.fn(db.submit)
  const swStore = createStore(
    null,
    null,
    datavanEnhancer({
      overrides: {
        roles: relayWorker(db.fetch, workerSubmit),
        blogs: relayWorker(db.fetch, workerSubmit),
        users: relayWorker(db.fetch, workerSubmit),
      },
    })
  )
  // persist swStore instead of winStore
  // post message to service-worker
  serviceWorkerChannel.addEventListener(event => {
    handleRelay(swStore, event.data).then(feedbackChannel.postMessage)
  })

  expect(Roles(winStore).find(['ADMIN', 'READER'])).toEqual([])

  expect(Blogs(winStore).get('blog-1')).toEqual(undefined)

  // wait for relay
  await delay(60)

  // after post back and come, can get data
  expect(Roles(winStore).find(['ADMIN', 'READER'])).toEqual([{ _id: 'ADMIN', name: 'ADMIN' }, { _id: 'READER', name: 'READER' }])

  expect(Blogs(winStore).get('blog-1')).toEqual({ _id: 'blog-1', name: 'BLOG-1' })

  expect(await Users(winStore).findAsync(['user-1'])).toEqual([{ _id: 'user-1', name: 'USER-1' }])

  // submit
  set(Blogs(winStore), 'blog-1', { _id: 'blog-1', name: 'Relay Fetcher' })
  // wait for relay
  await delay(60)
  expect(await Blogs(winStore).findAsync({ _key: 'blog-1' })).toMatchObject([{ _key: 'blog-1', name: 'Relay Fetcher' }])

  expect(workerSubmit).toHaveBeenCalledTimes(1)
  expect(workerSubmit).toBeCalledWith({ 'blog-1': { _id: 'blog-1', name: 'Relay Fetcher' } }, expect.anything())
})
