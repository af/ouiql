// Query context is an object of static variables that are available to every query
// These values are lightly sanitized to prevent SQL injection, although you really
// should not provide user input as query context (use regular query parameters for that)

/*::
type QueryContext = {
    relation: string,
    readFields: string,
    [string]: string
}
*/

// Match characters that should be stripped from interpolated static context
const invalidVarChars = /[^\w, *]/g

exports.sanitize = (ctx /*:QueryContext*/) /*:QueryContext*/ => {
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

