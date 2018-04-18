**datavan: in-memory mongodb for react that can track changes and sync with server**

![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square)
[![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

**Features**

* based on [New React Context](https://reactjs.org/docs/context.html)
* mongodb-like find(), update() api
* design with offline in mind
* customizable server fetch, submit, persistent, conflict-resolve logic
* built-in reselect-like memoizing layer
* supports server rendering
* code in es6, support tree-shaking

**How It works?**

During find(), datavan will query your local-data first. If local-data is missing, it will call your onFetch() as a side effect and update the local-data.

**Table of Contents**

<!-- TOC START min:1 max:3 link:true update:true -->
- [Getting Started](#getting-started)
- [Setup](#setup)
    - [datavanEnhancer](#datavanenhancer)
    - [use with redux's combineReducers](#use-with-reduxs-combinereducers)
    - [data in redux store state](#data-in-redux-store-state)
- [Better Performance](#better-performance)
    - [connectOnChange](#connectonchange)
    - [withMethods](#withmethods)
- [API](#api)
    - [find, pick](#find-pick)
    - [findAsync, pickAsync](#findasync-pickasync)
    - [findInMemory](#findinmemory)
    - [checkFetch](#checkfetch)
    - [get](#get)
    - [getAll, getOriginals, getSubmits](#getall-getoriginals-getsubmits)
    - [insert](#insert)
    - [update](#update)
    - [remove](#remove)
    - [mutate](#mutate)
    - [set](#set)
    - [reset](#reset)
    - [load](#load)
    - [submit](#submit)
    - [recall](#recall)
    - [getCollection](#getcollection)
    - [resetStore](#resetstore)
- [Extra](#extra)
    - [genTmpId](#gentmpid)
    - [getState to get latest fetching time](#getstate-to-get-latest-fetching-time)
    - [getPending, getStorePending to wait for fetching](#getpending-getstorepending-to-wait-for-fetching)
    - [loadCollections](#loadcollections)
    - [get and listen to browser size](#get-and-listen-to-browser-size)
    - [Server Rendering](#server-rendering)

<!-- TOC END -->

**Other Docs**

* [searchObjects](https://github.com/ericfong/datavan/blob/master/src/extra/searchObjects.md)

# Getting Started

```js
import _ from 'lodash'
import { createDatavanContext } from 'datavan'

const Van = createDatavanContext({
  // defined collection called 'myUserTable'
  myUserTable: {
    onFetch(collection, query, option) {
      return Promise.resolve([{ _id: 'id', name: 'john' }])
    },
  },
})

render(
  <Van.Provider store={store}>
    ...
    <Van>
      {db => {
        // first call result will be undefined
        // after HTTP response, connect will be re-run
        // second result will get user object
        const users = db.find('myUserTable', { name: { $in: ['John'] } })

        const onClick = () => db.update('myUserTable', { name: 'John' }, { $merge: { name: 'smith' } })

        return (
          <button onClick={onClick}>
            {_.map(users, 'name').join()}
          </button>
        )
      }}
    </Van>
    ...
  </Van.Provider>
)
```

* [query syntax from mingo](https://www.npmjs.com/package/mingo)
* [update syntax from immutability-helper](https://www.npmjs.com/package/immutability-helper)

# Setup

### createDb

```js
import { createDb } from 'datavan'

const db = createDb({
  myUserTable: {
    // id field for document (default: `_id`)
    idField: 'id',

    // async fetch function (default: `undefined`). Should return array or map of documents
    onFetch(query, option, collection) {
      return fetch('restful-api?name=john')
    },

    // cast and convert doc fields. Return: casted doc
    // NOTE only cast to primitive types that can use === to compare. (DON'T cast to Date, Object, Array or anything that cannot be JSON.stringify)
    cast(doc) {
      doc.count = parseInt(doc.count, 10)
      // Can cast to Number as count === JSON.parse(JSON.stringify(count))
      doc.arr = 'a,b'.split(',')
      // Can cast to Number as arr !== JSON.parse(JSON.stringify(arr))
      return doc
    },

    onInsert(doc) {
    },

    onLoad(doc) {
    },

    // generate a new tmp id string (default: genId from datavan)
    genId: genId,

    getFetchQuery: (query, idField) => '',
    // calculate and return fetchKey (to determine cache hit or miss) from fetchQuery (default: defaultGetQueryString from datavan)
    getFetchKey: (query, option) => '',

    // another way to setup initial data. With `{ byId: {}, originals: {}, fetchAts: {} }` object tables.
    initState: {
      // byId is table of docs
      byId: {
        'user-1': { _id: 'user-1', name: 'John' },
      },
      // originals is table of modified docs' originals
      originals: {
        'user-1': { _id: 'user-1', name: 'Old Name' },
      },
      // fetchAts is server fetched queries times (msec, to prevent re-fetch after server rendering)
      fetchAts: {},
    },
  },
})

db.find('myUserTable', { name: 'John' })
```

### use with redux's combineReducers

if you use `combineReducers`, you also need to use `createVanReducer`

```js
import { createVanReducer } from 'datavan'

const vanConf = { collections }

const rootReducer = combineReducers({ ..., datavan: createVanReducer(vanConf) })

const store = createStore(rootReducer, preloadedState, datavanEnhancer(vanConf))
```

### data in redux store state

datavan will store docs in the following structure

```js
const state = store.getState()

state = {
  datavan: {
    user_table: {
      byId: {
        id_1: {
          _id: 'id_1',
          name: 'John',
        },
        id_2: {
          _id: 'id_2',
          name: 'May',
        },
      },

      // table of modified docs' originals
      originals: {},

      // server fetch times/markers (msec, to prevent re-fetch after server rendering)
      fetchAts: {},
    },
  },
}
```

You can use any redux persist packages to save and load data

# Better Performance

### connectOnChange

connectOnChange can memoize map state function result and only re-run if specified props and accessed collections is changed. Accessed collections will be auto-detected.

```js
connectOnChange(['array', 'of', 'props', 'keys'], mapStateFunction)

const MyApp = connectOnChange(
  // array of props keys
  ['name', 'role'],
  // map state function
  (state, { name, role }) => {
    return { user: find(state, 'user_table', { name, role })[0] }
  }
)(PureComponent)
```

### withMethods

use withMethods to prevent re-create handler functions when props changed

```js
withMethods({
  onClick(props, event) {
    // props will be inject as the first argument
    // you can also use this.state and this.setState()
    event.preventDefault()
    return mutate(props.dispatch, 'user_table', 'id-1', { x: { $set: 1 } })
  },
})(Comp)
```

# API

### find, pick

```js
find(state, collection, query, [option])
// Return: Array of documents
```

* state: redux state or dispatch function or store object
* collection: collection name
* query: Array<id> | query-object (mongodb like query object, we use [mingo](https://www.npmjs.com/package/mingo) to filter documents)

```js
arr = find(state, 'user_table', { name: 'john' })

// query starts with $$ which trigger find within the result from onFetch response
arr = find(state, 'user_table', { name: 'john', $$limit: 10, $$sort: ... })

userById = pick(state, 'user_table', { name: 'john' })
```

### findAsync, pickAsync

```js
findAsync(stateOrDispatch, collection, query, [option])

byId = pickAsync(stateOrDispatch, collection, query, [option])
```

Async function that always fetch and find data from server

### findInMemory

like find() but only find in local memory

### checkFetch

internally used by find(), findAsync() to call onFetch and return a raw result in promise. Without call findInMemory() after onFetch to normalise onFetch result.

### get

```js
doc = get(stateOrDispatch, 'user_table', 'id-123')
```

### getAll, getOriginals, getSubmits

```js
// get all documents. This won't trigger onFetch()
const docsTable = getAll(stateOrDispatch, 'user_table')

// get local changed documents
const dirtyDocs = getSubmits(stateOrDispatch, 'user_table')

// get local changed documents' originals
const originalDocs = getOriginals(stateOrDispatch, 'user_table')
```

### insert

Return: inserted docs

```js
insertedDoc = insert(stateOrDispatch, 'user_table', { name: 'Mary' })
// can also insert array
insertedDocs = insert(stateOrDispatch, 'user_table', [{ name: 'Mary' }, { name: 'John' }])
```

### update

* update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)

```js
const query = { name: 'Mary' }
const mutation = { $merge: { name: 'Mary C' } }
update(stateOrDispatch, 'user_table', query, mutation)
```

### remove

remove all docs that match the query

```js
remove(stateOrDispatch, 'user_table', { name: 'May' })
```

### mutate

mutate documents using [immutability-helper](https://www.npmjs.com/package/immutability-helper) syntax

```js
// merge by doc id
mutate(stateOrDispatch, 'user_table', 'id-123', { $merge: { name: 'Mary' } })

// merge by array of path
mutate(stateOrDispatch, 'user_table', ['id-123', 'name'], { $set: 'Mary' })

// merge in many docs
mutate(stateOrDispatch, 'user_table', { $merge: { docId1: doc1, docId2: doc2 } })
```

### set

shortcut of [mutate](#mutate) which always use `{ $set: value }`

### reset

reset local change and re-fetch in future get/find

```js
// reset all docs, both mutated or non-mutated (default option: { expired = false, mutated = true })
reset(stateOrDispatch, 'user_table', [option])

// reset only expired docs, both mutated or non-mutated
// expire time controlled by collection's gcTime
reset(stateOrDispatch, 'user_table', { expired: true })

// reset only expired docs, non-mutated-only
reset(stateOrDispatch, 'user_table', { expired: true, mutated: false })

// reset by ids array, ids will be ignored if expired=true
reset(stateOrDispatch, 'user_table', { ids: ['id-1'], mutated: false })
```

### load

load bulk data into store. data can be

```js
load(stateOrDispatch, collection, data, option)
```

* Array of docs
* Or a object with `{ byId: {}, originals: {}, fetchAts: {} }`
* Or Table of docs

```js
// Array of docs
load(stateOrDispatch, collection, [{ _id: 'user-1', name: 'John' }])

// Or a object with at least one of `{ byId: {}, originals: {}, fetchAts: {} }`
load(stateOrDispatch, collection, {
  // byId is table of docs
  byId: {
    'user-1': { _id: 'user-1', name: 'John' },
  },
  // originals is table of modified docs' originals
  originals: {
    'user-1': { _id: 'user-1', name: 'Old Name' },
  },
  // fetchAts is server fetched queries times (msec, to prevent re-fetch after server rendering)
  fetchAts: {},
  // submitted tmp and stored id mapping
  $submittedIds: { tmpId: storedId },
})

// Or Table of docs (byId)
load(stateOrDispatch, collection, {
  'user-1': { _id: 'user-1', name: 'John' },
})
```

* load() data will consider as fill data from backend and trigger re-render

### submit

submit collection with onSubmitFunc. If onSubmitFunc is missing, will use collection's onSubmit

```js
await submit(stateOrDispatch, 'user_table', [onSubmitFunc])
```

### recall

call a function (anonymous or collection-defined) only-if store data or argument changed. If no changes, cached result will be used.

```js
// recall collection-defined function
createStore(
  reducer,
  state,
  datavanEnhancer({
    collections: {
      user_table: {
        groupBy(byId, arg1) {
          return _.groupBy(byId, arg1)
        },
      },
    },
  })
)
const result = recall(state, 'user_table', 'groupBy', 'arg1-value')
```

### getCollection

get collection instance from redux store

```js
const store = createStore()
const collection = getCollection(store | state | dispatch, 'collection-name')
```

### resetStore

resetStore all collections data

```js
resetStore(store, { expired: true | false, ids: ['idStr'], mutated: true | false })
```

# Extra

### genTmpId

```js
const newTmpId = genTmpId(store)
```

### getState to get latest fetching time

You can use

```js
const fetchingAt = getCollection(store, 'collection_name').getState().fetchingAt
// return msec elapsed since January 1, 1970 00:00:00 UTC
```

### getPending, getStorePending to wait for fetching

```js
await getPending(store, 'collection_name')
await getStorePending(store)
```

### loadCollections

like [`load`](#load) but load multiple collection data in one dispatch cycle

```js
resetStore(store, { user_table: [...], other_table: [...] })
```

### get and listen to browser size

get width & height and listen to browser resize automatically. You are better use css to build responsive layout.

```js
const browserWidth = getBrowserWidth(state, collectionName, (widthKey = 'browserWidth'))
const browserHeight = getBrowserHeight(state, collectionName, (heightKey = 'browserHeight'))
```

### Server Rendering

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
    user: find(state, 'users', { username }, { serverPreload: true })[0],
  }
})(PureComponent)

// create store
const serverStore = createStore(null, null, datavanEnhancer({ collections }))

// serverPreload will wait for all serverPreload marked find/fetches done
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
