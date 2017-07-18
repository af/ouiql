# Ouiql

ORMless approach for working with SQL databases in Node, heavily inspired by [yesql](https://github.com/krisajenkins/yesql) and [this blog post](http://tapoueh.org/blog/2017/06/how-to-write-sql/)

Currently this is an alpha-quality WIP!


## Usage

Write your queries in SQL files, and then create a "store" object that reads them from the
filesystem and converts them into JavaScript functions.

**In `myproject/users/updateName.sql`:
```sql
UPDATE users SET name = :name WHERE id = :id;
```

**In `myproject/users/store.js`
```js
const ouiql = require('ouiql')
const pool = new require('pg').Pool({connectionString: 'postgresql:....'})
const backend = ouiql.makeBackend({sendQuery: pool.query.bind(pool)})

const userStore = ouiql.makeStore(backend, {
    relation: 'users',
    sqlPath: __dirname
})

// Now you can require userStore from elsewhere in your app and make a query like this:
userStore.updateName({id: 1, name: 'Richard Hendricks'})   // => Promise
```


## Conventions

All query functions:

* return a Promise
* accept a single object parameter that contains named arguments


## License

MIT
