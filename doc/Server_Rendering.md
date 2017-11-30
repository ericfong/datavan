# Server Rendering

```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { datavanEnhancer, serverPreload } from '.'

// define collection
const collections = {
  users: {
    onFetch(query, option) { /* browser side implementation */ },
  },
}

// connect react component
const MyApp = connect((state, { username }) => {
  return {
    user: findOne(state, 'users', { username }, { serverPreload: true }),
  }
})(PureComponent)

// create store
const serverStore = createStore(null, null, datavanEnhancer({ collections }))

// renderToString
const html = await serverPreload(serverStore, () =>
  ReactDOMServer.renderToString(<Provider store={serverStore}><MyApp /></Provider>)
)

// transfer data to browser
const json = JSON.stringify(store.getState())

// -------

// browser side
const preloadedState = JSON.parse(json)
const browserStore = createStore(null, preloadedState, datavanEnhancer({ collections }))

ReactDOM.render(<Provider store={browserStore}><MyApp /></Provider>, dom)
```
