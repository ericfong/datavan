/* eslint-disable react/jsx-filename-extension */

import _ from 'lodash'
import React from 'react'
import { createStore } from 'redux'
import { connect, Provider } from 'react-redux'
import { render } from 'enzyme'
import { createEnhancer, collect, serverPreload } from '.'
import { getQueryIds } from './Collection/SyncFinder'

test('server preload', async () => {
  const Users = collect('users')
  const adapters = {
    users: {
      onFetch(collection, query) {
        if (query && query._id) {
          return Promise.resolve(_.map(getQueryIds(query, collection.idField), _id => ({ _id, name: _.toUpper(_id), friendId: 'u1' })))
        }
        return Promise.resolve([])
      },
    },
  }
  const store = createEnhancer(adapters)(createStore)()

  const UserComp = connect((state, props) => ({
    user: Users(state).findOne({ _id: props.userId }, { serverPreload: true }),
  }))(props => {
    const user = props.user || {}
    return (
      <span>
        {user.name}
      </span>
    )
  })

  const FriendComp = connect(state => ({
    user: Users(state).findOne({ _id: 'u2' }, { serverPreload: true }),
  }))(props => {
    const user = props.user || {}
    return (
      <span>
        {user.name} is <UserComp userId={user.friendId} /> friend
      </span>
    )
  })

  // server side render
  const wrapper = await serverPreload(store, () =>
    render(
      <Provider store={store}>
        <FriendComp />
      </Provider>
    )
  )
  expect(wrapper.html()).toBe('<span>U2 is <span>U1</span> friend</span>')

  // transfer data to client
  const json = JSON.stringify(store.getState())
  const isoData = JSON.parse(json)

  // client side
  const browserDb = createEnhancer()(createStore)(null, isoData)
  const browserWrapper = render(
    <Provider store={browserDb}>
      <FriendComp />
    </Provider>
  )
  expect(browserWrapper.html()).toBe('<span>U2 is <span>U1</span> friend</span>')
})
