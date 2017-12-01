/* eslint-disable react/jsx-filename-extension */

import _ from 'lodash'
import React from 'react'
import { createStore } from 'redux'
import { connect, Provider } from 'react-redux'
import { render } from 'enzyme'

import '../test/enzyme-setup'
import { datavanEnhancer, serverPreload, findOne } from '..'
import { getQueryIds } from '../collection/util/idUtil'

test('server preload', async () => {
  const collections = {
    users: {
      onFetch(query, option, collection) {
        if (query && query._id) {
          return Promise.resolve(_.map(getQueryIds(query, collection.idField), _id => ({ _id, name: _.toUpper(_id), friendId: 'u1' })))
        }
        return Promise.resolve([])
      },
    },
  }
  const store = createStore(null, null, datavanEnhancer({ collections }))

  const UserComp = connect((state, props) => ({
    user: findOne(state, 'users', { _id: props.userId }, { serverPreload: true }),
  }))(props => {
    const user = props.user || {}
    return <span>{user.name}</span>
  })

  const FriendComp = connect(state => ({
    user: findOne(state, 'users', { _id: 'u2' }, { serverPreload: true }),
  }))(props => {
    const user = props.user || {}
    return (
      <span>
        {user.name} is <UserComp userId={user.friendId} /> friend
      </span>
    )
  })

  // server side render
  const wrapper = await serverPreload(store, () => render(React.createElement(Provider, { store }, <FriendComp />)))
  expect(wrapper.html()).toBe('U2 is <span>U1</span> friend')

  // transfer data to client
  const json = JSON.stringify(store.getState())
  const isoData = JSON.parse(json)

  // client side
  const browserDb = createStore(null, isoData, datavanEnhancer({ collections }))
  const browserWrapper = render(React.createElement(Provider, { store: browserDb }, <FriendComp />))
  expect(browserWrapper.html()).toBe('U2 is <span>U1</span> friend')
})
