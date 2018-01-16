/* eslint-disable react/jsx-filename-extension */
import React from 'react'
import { createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { mount } from 'enzyme'

import './util/enzyme-setup'
import { datavanReducer, datavanEnhancer, getStorePending, loadCollections, set, getAll, get } from '..'

test('merge state with redux dispatch changes by another reducer', () => {
  const collections = { memory: {} }
  const store = createStore((state, action) => (action.type === 'rehydrate' ? action.state : state), {}, datavanEnhancer({ collections }))

  // init and set
  set(store, 'memory', 'theme', 'dark')

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

  set(store, 'memory', 'after', 'yes')

  expect(getAll(store, 'memory')).toEqual({ theme: 'light', locale: 'en', after: 'yes' })
  expect(store.getState().datavan.memory.byId).toEqual({ theme: 'light', locale: 'en', after: 'yes' })
})

test('combineReducers', async () => {
  const preloadState = {
    datavan: {
      memory: { byId: { theme: 'light' } },
    },
  }
  const store = createStore(
    // combineReducers will remove all state that without keys
    combineReducers({
      other: state => state || null,
      datavan: datavanReducer,
    }),
    preloadState,
    datavanEnhancer({ collections: { memory: {} } })
  )

  expect(store.getState()).toMatchObject(preloadState)
  expect(getAll(store, 'memory')).toEqual({ theme: 'light' })

  set(store, 'memory', 'theme', 'dark')
  await getStorePending(store)
  expect(store.getState().datavan.memory).toMatchObject({ byId: { theme: 'dark' } })
  expect(getAll(store, 'memory')).toEqual({ theme: 'dark' })
})

test('basic', () => {
  const store = createStore(s => s || {}, null, datavanEnhancer({ collections: { users: {} } }))

  let lastClickValue
  const UserComp = connect(
    state => ({
      user1: get(state, 'users', 'u1'),
    }),
    dispatch => ({
      onClick() {
        lastClickValue = get(dispatch, 'users', 'u1')
      },
    })
  )(props => {
    props.onClick()
    return <span>{props.user1}</span>
  })

  set(store, 'users', 'u1', 'user 1 name!!')

  const wrapper = mount(React.createElement(Provider, { store }, <UserComp />))

  expect(wrapper.html()).toBe('<span>user 1 name!!</span>')
  expect(lastClickValue).toBe('user 1 name!!')
})
