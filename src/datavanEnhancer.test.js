/* eslint-disable react/jsx-filename-extension */
import React from 'react'
import { createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { mount } from 'enzyme'

import './test/enzyme-setup'
import { datavanReducer, datavanEnhancer, defineCollection, getStorePending, loadCollections, set, getState } from '.'

test('merge state with redux dispatch changes by another reducer', () => {
  const Memory = defineCollection('memory')
  const store = createStore((state, action) => (action.type === 'rehydrate' ? action.state : state), {}, datavanEnhancer())

  // init and set
  set(Memory(store), 'theme', 'dark')

  // dispatch and change before flush
  const datavan = loadCollections(store, {
    memory: { byId: { theme: 'light', locale: 'en' } },
  })
  store.dispatch({
    type: 'rehydrate',
    // NOTE need to loadCollections and merge into datavan namespace
    state: {
      ...store.getState(),
      datavan,
    },
  })

  set(Memory(store), 'after', 'yes')

  expect(getState(Memory(store)).byId).toEqual({ theme: 'light', locale: 'en', after: 'yes' })
  expect(store.getState().datavan.memory.byId).toEqual({ theme: 'light', locale: 'en', after: 'yes' })
})

test('combineReducers', async () => {
  const preloadState = {
    datavan: {
      memory: { byId: { theme: 'light' } },
    },
  }
  const Memory = defineCollection('memory')
  const store = createStore(
    // combineReducers will remove all state that without keys
    combineReducers({
      other: state => state || null,
      datavan: datavanReducer,
    }),
    preloadState,
    datavanEnhancer()
  )

  expect(store.getState()).toMatchObject(preloadState)
  expect(Memory(store).getAll()).toEqual({ theme: 'light' })

  set(Memory(store), 'theme', 'dark')
  await getStorePending(store)
  expect(store.getState().datavan.memory).toMatchObject({ byId: { theme: 'dark' } })
  expect(Memory(store).getAll()).toEqual({ theme: 'dark' })
})

test('same state', () => {
  const Users = defineCollection('users')
  const store = createStore(null, null, datavanEnhancer())
  set(Users(store), 'u1', 'user 1 name!!')

  let runTime = 0
  const UserComp = connect(state => {
    runTime++
    return {
      user1: Users(state).get('u1'),
    }
  })(props => <span>{props.user1}</span>)
  const wrapper = mount(
    <Provider store={store}>
      <UserComp />
    </Provider>
  )
  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(runTime).toBe(1)

  // same value
  set(Users(store), 'u1', 'user 1 name!!')
  expect(runTime).toBe(1)

  // diff value
  set(Users(store), 'u1', 'Changed', { flush: true })
  expect(runTime).toBe(2)
})

test('basic', () => {
  const Users = defineCollection('users')
  const store = createStore(null, null, datavanEnhancer())

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
    return <span>{props.user1}</span>
  })

  set(Users(store), 'u1', 'user 1 name!!')

  const wrapper = mount(
    <Provider store={store}>
      <UserComp />
    </Provider>
  )

  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(lastClickValue).toBe('user 1 name!!')
})
