import _ from 'lodash'
import { createStore } from 'redux'
import delay from 'delay'

import { datavanEnhancer, relayClient, relayWorker, set, insert, findOne, allPendings, find, get, findAsync } from '..'
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

test('can wait for submit', async () => {
  const serviceWorkerChannel = new FakeChannel()
  const feedbackChannel = new FakeChannel()

  // client
  const relayC = relayClient({ onMessage: serviceWorkerChannel.postMessage })
  const winStore = createStore(s => s || {}, null, datavanEnhancer({ collections: { blogs: relayC({}) }, side: 'client' }))
  feedbackChannel.addEventListener(event => relayC.onWorkerMessage(winStore, event.data))

  // service-worker
  const db = new EchoDB()
  const workerSubmit = jest.fn(db.submit)
  const workerFetch = jest.fn(db.fetch)
  const relayW = relayWorker({
    onFetch: workerFetch,
    onSubmit: workerSubmit,
    onMessage: feedbackChannel.postMessage,
  })
  const swStore = createStore(s => s || {}, null, datavanEnhancer({ collections: { blogs: relayW({}) }, side: 'worker' }))
  serviceWorkerChannel.addEventListener(event => relayW.onClientMessage(swStore, event.data))

  // start test
  insert(winStore, 'blogs', { text: 'ABC' })

  await Promise.all(allPendings(winStore, 'blogs'))

  expect(findOne(winStore, 'blogs')._id).toEqual(expect.stringMatching(/^stored-/))
})

test('basic', async () => {
  const roles = { name: 'roles', idField: 'name' }
  const blogs = { name: 'blogs' }
  const users = { name: 'users' }

  const serviceWorkerChannel = new FakeChannel()
  const feedbackChannel = new FakeChannel()

  // should use one relay for similar collections
  const relayC = relayClient({ onMessage: serviceWorkerChannel.postMessage })
  const winStore = createStore(
    s => s || {},
    null,
    datavanEnhancer({
      collections: {
        roles: relayC(roles),
        blogs: relayC(blogs),
        users: relayC(users),
      },
      side: 'client',
    })
  )
  feedbackChannel.addEventListener(event => relayC.onWorkerMessage(winStore, event.data))

  // service-worker
  const db = new EchoDB()
  const workerSubmit = jest.fn(db.submit)
  const workerFetch = jest.fn(db.fetch)
  const relayW = relayWorker({
    onFetch: workerFetch,
    onSubmit: workerSubmit,
    onMessage: feedbackChannel.postMessage,
  })
  const swStore = createStore(
    s => s || {},
    null,
    datavanEnhancer({
      collections: {
        roles: relayW(roles),
        blogs: relayW(blogs),
        users: relayW(users),
      },
      side: 'worker',
    })
  )
  // persist swStore instead of winStore
  // post message to service-worker
  serviceWorkerChannel.addEventListener(event => relayW.onClientMessage(swStore, event.data))

  // start test
  expect(find(winStore, 'roles', ['ADMIN', 'READER'])).toEqual([])

  expect(get(winStore, 'blogs', 'blog-1')).toEqual(undefined)

  // wait for relay
  await delay(60)

  // after post back and come, can get data
  expect(find(winStore, 'roles', ['ADMIN', 'READER'])).toEqual([{ _id: 'ADMIN', name: 'ADMIN' }, { _id: 'READER', name: 'READER' }])

  expect(get(winStore, 'blogs', 'blog-1')).toEqual({ _id: 'blog-1', name: 'BLOG-1' })

  expect(await findAsync(winStore, 'users', ['user-1'])).toEqual([{ _id: 'user-1', name: 'USER-1' }])

  // submit
  set(winStore, 'blogs', 'blog-1', { _id: 'blog-1', name: 'Relay Fetcher' })
  // wait for relay
  await delay(60)
  expect(await findAsync(winStore, 'blogs', { _key: 'blog-1' })).toMatchObject([{ _key: 'blog-1', name: 'Relay Fetcher' }])

  expect(workerSubmit).toHaveBeenCalledTimes(1)
  expect(workerSubmit).toBeCalledWith({ 'blog-1': { _id: 'blog-1', name: 'Relay Fetcher' } }, expect.anything())

  // find same thing wrong trigger fetch again
  workerFetch.mockClear()
  find(winStore, 'blogs', {})
  await delay(60)
  find(winStore, 'blogs', {})
  await delay(60)
  expect(workerFetch).toHaveBeenCalledTimes(1)
})
