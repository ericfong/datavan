/* eslint-disable react/jsx-filename-extension */

import React from 'react'
import { createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { mount } from 'enzyme'

import '../tool/test-setup'
import { datavanReducer, datavanEnhancer, table, getStorePending } from '.'

test('merge state with redux dispatch changes by another reducer', async () => {
  const preloadState = {
    datavan: {
      memory: { byId: { theme: 'light', locale: 'en' } },
    },
  }
  const Memory = state => table(state, { name: 'memory' })
  const store = createStore(
    (state, action) => {
      if (action.type === 'autoRehydrate') {
        return preloadState
      }
      return state
    },
    {},
    datavanEnhancer
  )

  // init and set
  Memory(store.van).set('theme', 'dark')

  // dispatch and change before flush
  store.dispatch({ type: 'autoRehydrate' })

  Memory(store.van).set('after', 'yes')

  expect(store.getState().datavan.memory.byId).toEqual({ theme: 'light', locale: 'en' })
  expect(Memory(store.van).getState().byId).toEqual({ theme: 'light', locale: 'en', after: 'yes' })
})

test('combineReducers', async () => {
  const preloadState = {
    datavan: {
      memory: { byId: { theme: 'light' } },
    },
  }
  const Memory = state => table(state, { name: 'memory' })
  const store = createStore(
    // combineReducers will remove all state that without keys
    combineReducers({
      other: state => state || null,
      datavan: datavanReducer,
    }),
    preloadState,
    datavanEnhancer
  )

  expect(store.getState()).toMatchObject(preloadState)
  expect(Memory(store.van).getAll()).toEqual({ theme: 'light' })

  Memory(store.van).set('theme', 'dark')
  await getStorePending(store)
  expect(store.getState().datavan.memory).toMatchObject({ byId: { theme: 'dark' } })
  expect(Memory(store.van).getAll()).toEqual({ theme: 'dark' })
})

it('same state', async () => {
  const Users = state => table(state, { name: 'users' })
  const store = createStore(null, null, datavanEnhancer)
  Users(store.van).set('u1', 'user 1 name!!')

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
  Users(store.van).set('u1', 'user 1 name!!')
  expect(runTime).toBe(1)

  // diff value
  Users(store.van).set('u1', 'Changed', { flush: true })
  expect(runTime).toBe(2)
})

it('basic', async () => {
  const Users = state => table(state, { name: 'users' })
  const store = createStore(null, null, datavanEnhancer)

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

  Users(store.van).set('u1', 'user 1 name!!')

  const wrapper = mount(
    <Provider store={store}>
      <UserComp />
    </Provider>
  )

  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(lastClickValue).toBe('user 1 name!!')
})
