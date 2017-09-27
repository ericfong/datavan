/* eslint-disable react/jsx-filename-extension */

import _ from 'lodash'
import React from 'react'
import { createStore } from 'redux'
import { connect, Provider } from 'react-redux'
import { render } from 'enzyme'

import '../test/enzyme-setup'
import { datavanEnhancer, defineCollection, serverPreload, findOne } from '..'
import { getQueryIds } from '../collection/util/idUtil'

test('server preload', async () => {
  const Users = defineCollection({
    name: 'users',
    onFetch(query) {
      if (query && query._id) {
        return Promise.resolve(_.map(getQueryIds(query, this.idField), _id => ({ _id, name: _.toUpper(_id), friendId: 'u1' })))
      }
      return Promise.resolve([])
    },
  })
  const store = createStore(null, null, datavanEnhancer())

  const UserComp = connect((state, props) => ({
    user: findOne(Users(state), { _id: props.userId }, { serverPreload: true }),
  }))(props => {
    const user = props.user || {}
    return <span>{user.name}</span>
  })

  const FriendComp = connect(state => ({
    user: findOne(Users(state), { _id: 'u2' }, { serverPreload: true }),
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
  expect(wrapper.html()).toBe('U2 is <span>U1</span> friend')

  // transfer data to client
  const json = JSON.stringify(store.getState())
  const isoData = JSON.parse(json)

  // client side
  const browserDb = createStore(null, isoData, datavanEnhancer())
  const browserWrapper = render(
    <Provider store={browserDb}>
      <FriendComp />
    </Provider>
  )
  expect(browserWrapper.html()).toBe('U2 is <span>U1</span> friend')
})
