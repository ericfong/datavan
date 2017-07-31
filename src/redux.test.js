/* eslint-disable react/jsx-filename-extension */

import React from 'react'
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { mount } from 'enzyme'

import '../tool/test-setup'
import { createEnhancer, getCollection } from '.'

it('same state', async () => {
  const Users = getCollection('users')
  const store = createStore(null, null, createEnhancer())
  Users(store).set('u1', 'user 1 name!!')

  let runTime = 0
  const UserComp = connect(state => {
    runTime++
    return {
      user1: Users(state).get('u1'),
    }
  })(props =>
    (<span>
      {props.user1}
    </span>)
  )
  const wrapper = mount(
    <Provider store={store}>
      <UserComp />
    </Provider>
  )
  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(runTime).toBe(1)

  // same value
  Users(store).set('u1', 'user 1 name!!')
  expect(runTime).toBe(1)

  // diff value
  Users(store).set('u1', 'Changed', { flush: true })
  expect(runTime).toBe(2)
})

it('basic', async () => {
  const Users = getCollection('users')
  const store = createStore(null, null, createEnhancer())

  let lastClickValue
  const UserComp = connect(
    state => ({
      user1: Users(state).get('u1'),
    }),
    dispatch => ({
      onClick() {
        lastClickValue = Users(dispatch).get('u1')
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

  Users(store).set('u1', 'user 1 name!!')

  const wrapper = mount(
    <Provider store={store}>
      <UserComp />
    </Provider>
  )

  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(lastClickValue).toBe('user 1 name!!')
})
