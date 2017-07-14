/* eslint-disable react/jsx-filename-extension */
import _ from 'lodash'
import React from 'react'
import { Provider } from 'react-redux'
import { mount, render } from 'enzyme'

import '../tool/test-setup'
import { defineStore, withCollections, serverPreload, serverRender } from '.'
import KeyValueStore from './KeyValueStore'
import Collection from './Collection'
import connect from './connect'

const getQueryIds = query => (Array.isArray(query._id.$in) ? query._id.$in : [query._id])

test.only('server rendering', async () => {
  const definitions = {
    users: {
      onFetch(query) {
        if (query && query._id) {
          const ids = getQueryIds(query)
          return Promise.resolve(_.map(ids, _id => ({ _id, name: _.toUpper(_id), friendId: 'u1' })))
        }
        return Promise.resolve([])
      },
    },
  }
  const createStore = defineStore()
  const store = createStore()

  const UserComp = connect((dv, props) => {
    serverPreload(dv, true)
    return {
      user: dv.users.findOne({ _id: props.userId }),
    }
  })(props => {
    const user = props.user || {}
    return (
      <span>
        {user.name}
      </span>
    )
  })

  const FriendComp = connect(dv => {
    serverPreload(dv, true)
    return {
      user: dv.users.findOne({ _id: 'u2' }),
    }
  })(props => {
    const user = props.user || {}
    return (
      <span>
        {user.name} is <UserComp userId={user.friendId} /> friend
      </span>
    )
  })

  // server side render
  const FriendServer = withCollections(definitions)(FriendComp)
  const wrapper = await serverRender(store, () =>
    render(
      <Provider store={store}>
        <FriendServer />
      </Provider>
    )
  )
  expect(wrapper.html()).toBe('<span>U2 is <span>U1</span> friend</span>')

  // transfer data to client
  const json = JSON.stringify(store.getState())
  const isoData = JSON.parse(json)

  // client side
  const createBrowserStore = defineStore()
  const browserDb = createBrowserStore(null, isoData)
  // it is sync
  const FriendBrowser = withCollections({ users: Collection })(FriendComp)
  const browserWrapper = render(
    <Provider store={browserDb}>
      <FriendBrowser />
    </Provider>
  )
  expect(browserWrapper.html()).toBe('<span>U2 is <span>U1</span> friend</span>')
})

it('basic', async () => {
  const createStore = defineStore({
    users: KeyValueStore,
  })
  const store = createStore()

  let lastClickValue
  const UserComp = connect(
    dv => ({
      user1: dv.users.get('u1'),
    }),
    dv => ({
      onClick() {
        lastClickValue = dv.users.get('u1')
      },
    })
  )(props => {
    props.onClick()
    return (
      <span>
        {props.user1}
      </span>
    )
  })

  store.users.set('u1', 'user 1 name!!')

  const wrapper = mount(
    <Provider store={store}>
      <UserComp />
    </Provider>
  )

  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(lastClickValue).toBe('user 1 name!!')
})

it('same state', async () => {
  const createStore = defineStore({
    users: KeyValueStore,
  })
  const store = createStore()
  store.users.set('u1', 'user 1 name!!')

  let runTime = 0
  const UserComp = connect(dv => {
    runTime++
    return {
      user1: dv.users.get('u1'),
    }
  })(props =>
    <span>
      {props.user1}
    </span>
  )
  const wrapper = mount(
    <Provider store={store}>
      <UserComp />
    </Provider>
  )
  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(runTime).toBe(1)

  // same value
  store.users.set('u1', 'user 1 name!!')
  expect(runTime).toBe(1)

  // diff value
  store.users.set('u1', 'Changed')
  expect(runTime).toBe(2)
})
