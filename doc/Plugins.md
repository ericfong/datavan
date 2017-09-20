# Plugins

### plugBrowser
get and listen to browser resize, will mixin `getWidth()` and `getHeight()` functions
```js
datavanEnhancer({ overrides: { browser: plugBrowser } })  // plugBrowser is a object
```

### plugLocalStorage(localStorage | sessionStorage)
read, write localStorage or sessionStorage
```js
datavanEnhancer({ overrides: { sessionStorage: plugLocalStorage(sessionStorage) } })
```

### plugCookie(cookieConf)
read, write browser cookie
```js
datavanEnhancer({ overrides: { cookie: plugCookie(cookieConf) } })
// cookieConf ref to [js-cookie](https://www.npmjs.com/package/js-cookie)
```

### plugKoaCookie(cookieConf, koaCtx)
read, write cookie in koa
```js
datavanEnhancer({ overrides: { cookie: plugKoaCookie(cookieConf, koaCtx) } })
// cookieConf ref to [cookies](https://www.npmjs.com/package/cookies)
// koaCtx is koa ctx object
```

### plugSearchable({ fields: [] })
add simple full-text search to collection
```js
datavanEnhancer({ overrides: {
  users: plugSearchable({ fields: ['firstName', 'lastName', ...] })
} })
// OR
defineCollection('blogs', plugSearchable(...)({ idField: 'id', ...others }))
```
