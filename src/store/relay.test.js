// import _ from 'lodash'
import { createStore } from 'redux'

import { datavanEnhancer, defineCollection, setOverrides } from '..'
import onFetchEcho from '../test/onFetchEcho'

function createRelayPlugin() {}
function handleRelay() {}
// function handleRelayResponse() {}

test.skip('basic', async () => {
  const Roles = defineCollection({ name: 'roles', idField: 'role', onFetch: onFetchEcho })
  const Blogs = defineCollection({ name: 'blogs', onFetch: onFetchEcho })
  const Users = defineCollection({ name: 'users', onFetch: onFetchEcho })
  const winStore = createStore(null, null, datavanEnhancer())

  // tabs
  const relayPlugin = createRelayPlugin()
  setOverrides(winStore, {
    roles: relayPlugin,
    blogs: relayPlugin,
    users: relayPlugin,
  })
  // handleRelayResponse(winStore)

  // service-worker
  const swStore = createStore(null, null, datavanEnhancer())
  setOverrides(swStore, {
    roles: { onFetch: onFetchEcho },
    blogs: { onFetch: onFetchEcho },
    users: { onFetch: onFetchEcho },
  })
  handleRelay(swStore)
  // persist swStore instead of winStore
})
