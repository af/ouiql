// @flow
const assert = require('assert')
const debug = require('debug')('ouiql')

// Match characters that should be stripped from interpolated static context
const invalidVarChars = /[^\w, *]/g


/*::

import type {Backend, StoreContext} from './lib/backends.js'

type StoreInitOptions = {
    relation: string,
    context: {[string]: string},
    sqlPath: string
}
*/


const sanitizeCtx = (ctx /*:StoreContext*/) /*:StoreContext*/ => {
    const keys = Object.keys(ctx)
    return keys.reduce((acc, k) => {
        const contents /*:string*/ = ctx[k]
        const rawVar = Array.isArray(contents)
            ? contents.join(', ')
            : contents
        acc[k] = rawVar.replace(invalidVarChars, '')
        return acc
    }, {})
}

exports.makeStore = (backend /*:Backend*/, spec /*:StoreInitOptions*/) => {
    const {relation, context = {}, sqlPath} = spec
    assert(relation, '"relation" must be provided when making a store')

    // Set up the static context object that is interpolated into each query
    const ctx = sanitizeCtx(
        Object.assign({relation, readFields: '*'}, context)
    )

    const queryFnMap/*:{[string]: function}*/ = backend.buildQueryFunctions({sqlPath, ctx})

    assert(queryFnMap.create, 'create.sql must be present when making a store')
    debug(`Store "${relation}" has queries:`, Object.keys(queryFnMap))

    return queryFnMap
}

exports.makeBackend = require('./lib/backends').makeBackend
