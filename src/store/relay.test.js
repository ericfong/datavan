// import _ from 'lodash'
import { createStore } from 'redux'

import { datavanEnhancer, defineCollection, relayFetcher } from '..'
import onFetchEcho from '../test/onFetchEcho'

test.skip('basic', async () => {
  const Roles = defineCollection({ name: 'roles', idField: 'role' })
  const Blogs = defineCollection({ name: 'blogs' })
  const Users = defineCollection({ name: 'users' })

  const fetcher = () => {
    // post message to service-worker
  }
  const winStore = createStore(
    null,
    null,
    datavanEnhancer({
      overrides: {
        roles: relayFetcher(fetcher),
        blogs: relayFetcher(fetcher),
        users: relayFetcher(fetcher),
      },
    })
  )

  // tabs
  // handleRelayResponse(winStore)

  // service-worker
  const swStore = createStore(
    null,
    null,
    datavanEnhancer({
      overrides: {
        roles: { onFetch: onFetchEcho },
        blogs: { onFetch: onFetchEcho },
        users: { onFetch: onFetchEcho },
      },
    })
  )
  // handleRelay(swStore)
  // persist swStore instead of winStore
})
