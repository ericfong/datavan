# searchObjects(docs, keywordStr, getSearchFields)

| Name            | Type     | Default      | Description                  |
| --------------- | -------- | ------------ | ---------------------------- |
| docs            | `[doc]`  | **required** | the source of searching docs |
| keywordStr      | `string` | **required** | search keyword string        |
| getSearchFields | `Mixed`  | **required** | see below                    |

getSearchFields can be

Type = `function`

`function(doc) { return ['name', 'search-field', ...] }` function that return array of field names for searching per doc

Type = `Array<string>`

`['name', 'customer.mobile']` field names

Type = `Object`

`{ pick: Array<string> | function, tuneOrder: (relevance, doc) => newRelevance }`

# tokenizeKeywords(searchStr)

tokenize searchStr into token { "term": "...", exclude: true/false }
