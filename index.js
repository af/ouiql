// @flow
const assert = require('assert')
const debug = require('debug')('ouiql')

// Match characters that should be stripped from interpolated static context
const invalidVarChars = /[^\w, *]/g


/*::
type BackendInitOptions = {
    sendQuery: function
}
type Backend = {
    sendQuery: (string, Object) => Promise<*>,
    buildQueryFunctions: ({sqlPath: string, ctx: Object}) => Object
}

type StoreInitOptions = {
    tableName: string,
    context: StoreContext,
    sqlPath: string
}
type StoreContext = {
    tableName: string,
    readFields: string,
    [string]: string
}
*/


const sanitizeCtx = (ctx /*:StoreContext*/) /*:StoreContext*/ => {
    const keys = Object.keys(ctx)
    return keys.reduce((acc, k) => {
        let rawVar = ctx[k]
        if (Array.isArray(rawVar)) rawVar = rawVar.join(', ')
        acc[k] = rawVar.replace(invalidVarChars, '')
        return acc
    }, {})
}

exports.makeStore = (backend /*:Backend*/, spec /*:StoreInitOptions*/) => {
    const {tableName, context = {}, sqlPath} = spec
    assert(tableName, 'tableName must be provided when making a store')

    // Set up the static context object that is interpolated into each query
    const ctx = sanitizeCtx(
        Object.assign({tableName, readFields: '*'}, context)
    )

    const queryFnMap = backend.buildQueryFunctions({sqlPath, ctx})

    assert(queryFnMap.create, 'create.sql must be present when making a store')
    debug(`Store "${tableName}" has queries:`, Object.keys(queryFnMap))

    return queryFnMap
}

exports.makeBackend = require('./lib/backends').makeBackend
