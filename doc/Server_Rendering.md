# Server Rendering
```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { defineCollection, datavanEnhancer, serverPreload } from '.'

// define collection
const Users = defineCollection('users', {
  onFetch(query, option) { /* browser side implementation */ },
})

// connect react component
const MyApp = connect((state, { username }) => {
  return {
    user: Users(state).findOne({ username }, { serverPreload: true }),
  }
})(PureComponent)

// create store
const serverStore = createStore(null, null, datavanEnhancer(
  overrides: {
    users: {
      onFetch(query, option) { /* server side override */ },
    },
  },
))

// renderToString
const html = await serverPreload(serverStore, () =>
  ReactDOMServer.renderToString(<Provider store={serverStore}><MyApp /></Provider>)
)

// transfer data to browser
const json = JSON.stringify(store.getState())

// -------

// browser side
const preloadedState = JSON.parse(json)
const browserStore = createStore(null, preloadedState, datavanEnhancer())

ReactDOM.render(<Provider store={browserStore}><MyApp /></Provider>, dom)
```
