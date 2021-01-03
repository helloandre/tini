const p2r = (function(){
/**
 * included below is a modified version of path-to-regexp
 * does not include:
 *  - compile
 *  - tokensToFunction
 *  - arrays
 */

/**
 * Default configs.
 */
var DEFAULT_DELIMITER = "/";
var DEFAULT_DELIMITERS = "./";

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp(
  [
    // Match escaped characters that would otherwise appear in future matches.
    // This allows the user to escape special characters that won't transform.
    "(\\\\.)",
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // ":test(\\d+)?" => ["test", "\d+", undefined, "?"]
    // "(\\d+)"  => [undefined, undefined, "\d+", undefined]
    "(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?"
  ].join("|"),
  "g"
);

const l = arr => arr.length;

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
const parse = (str, options = {}) => {
  const tokens = [];
  const defaultDelimiter = (delimiters =
    options.delimiter || DEFAULT_DELIMITER);
  let key = 0;
  let index = 0;
  let pathEscaped = false;
  let res;
  let path = "";

  while ((res = PATH_REGEXP.exec(str)) !== null) {
    const [m, escaped, name, capture, group, modifier] = res;
    const offset = res.index;
    const next = str[index];
    let prev = "";

    path += str.slice(index, offset);
    index = offset + l(m);

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      pathEscaped = true;
      continue;
    }

    if (!pathEscaped && l(path)) {
      var k = l(path) - 1;

      if (delimiters.indexOf(path[k]) > -1) {
        prev = path[k];
        path = path.slice(0, k);
      }
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = "";
      pathEscaped = false;
    }

    var partial = prev !== "" && next !== undefined && next !== prev;
    var repeat = modifier === "+" || modifier === "*";
    var optional = modifier === "?" || modifier === "*";
    var delimiter = prev || defaultDelimiter;
    var pattern = capture || group;

    tokens.push({
      n: name || key++,
      v: prev,
      d: delimiter,
      o: optional,
      r: repeat,
      l: partial,
      a: pattern
        ? pattern.replace(/([=!:$/()])/g, "\\$1")
        : "[^" + escapeString(delimiter) + "]+?"
    });
  }

  // Push any remaining characters.
  if (path || index < l(str)) {
    tokens.push(path + str.substr(index));
  }

  return tokens;
};

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
const escapeString = str => {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
};

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {Array=}  keys
 * @return {!RegExp}
 */
const regexpToRegexp = (path, keys) => {
  if (!keys) return path;

  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < l(groups); i++) {
      keys.push({
        n: i,
        v: null,
        d: null,
        o: false,
        r: false,
        l: false,
        a: null
      });
    }
  }

  return path;
};

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
const tokensToRegExp = (tokens, keys, options = {}) => {
  var strict = options.strict;
  var delimiter = escapeString(options.delimiter || DEFAULT_DELIMITER);
  var delimiters = options.delimiters || DEFAULT_DELIMITERS;
  var endsWith = (options.endsWith || [])
    .map(escapeString)
    .concat("$")
    .join("|");
  var route = options.start ? "^" : "";
  var isEndDelimited = l(tokens) === 0;

  // Iterate over the tokens and create our regexp string.
  tokens.map((token, i) => {
    if (typeof token === "string") {
      route += escapeString(token);
      isEndDelimited =
        i === l(tokens) - 1 && delimiters.indexOf(token[l(token) - 1]) > -1;
    } else {
      var capture = token.r
        ? "(?:" +
          token.a +
          ")(?:" +
          escapeString(token.d) +
          "(?:" +
          token.a +
          "))*"
        : token.a;

      if (keys) keys.push(token);

      if (token.o) {
        route += token.l
          ? escapeString(token.v) + "(" + capture + ")?"
          : "(?:" + escapeString(token.v) + "(" + capture + "))?";
      } else {
        route += escapeString(token.v) + "(" + capture + ")";
      }
    }
  });

  if (options.end) {
    if (!strict) route += "(?:" + delimiter + ")?";

    route += endsWith === "$" ? "$" : "(?=" + endsWith + ")";
  } else {
    if (!strict) route += "(?:" + delimiter + "(?=" + endsWith + "))?";
    if (!isEndDelimited) route += "(?=" + delimiter + "|" + endsWith + ")";
  }

  return new RegExp(route, options.sensitive ? "" : "i");
};

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {Array=}                keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
return (path, keys, options) =>
  path instanceof RegExp
    ? regexpToRegexp(path, keys)
    : tokensToRegExp(parse(path, options), keys, options);

})();
module.exports = (function(){
/**
 * Tini - A mini web framework to handle routing and response
 * specifically designed to work with Cloudflare Workers
 *
 * NOTE: internal function names are intentionally shortented
 * because babel-minify does not shorten them when mangling
 *
 * TODO: make 404 message customizable
 * TODO: make 5xx errors handlable
 */

// character-saving optimizations
const R = Response;
let responses = {};

/**
 * handle
 *
 * iterate through all routes registered and find the first matching one
 *
 * @param {Request} req
 *
 * @return {Promise<Response>}
 */
const handle = async (req) => {
  const routes = responses[req.method] || [];
  // fun fact: supported in node 11.x and Workers
  const url = new URL(req.url);

  // iterate over all potential routes in the order they were added
  for (const route of routes) {
    const matches = route.r.exec(url.pathname);

    // we always return inside this block
    // which means that only the first matching route executes
    if (matches) {
      // set the values that may be needed on req
      req.pathname = url.pathname;
      req.params = params(matches, route.k);
      req.query = query(url.searchParams);

      // iterate through all the callbacks
      // returning the first non-null response
      for (const f of route.f) {
        // resolve any promises first if res is a promise
        const result = await Promise.resolve(f(req));
        if (result !== undefined) {
          // support 3 types of values for res:
          // 1. Response
          if (result instanceof R) {
            return result;
          }

          // 2. String
          if (typeof result === "string") {
            return new R(result);
          }

          // 3. JSON
          const headers = new Headers();
          headers.append("Content-Type", "application/json");
          return new R(JSON.stringify(result), { headers });
        }
      }
    }
  }

  // fallback in case nothing matches this route
  return new R("Not Found", { status: 404 });
};

/**
 * params - map the keys names (from p2r) to matches (from url)
 *
 * @param {Array} matches
 * @param {Array} keys
 */
const params = (matches, keys) => {
  const params = {};
  keys.forEach((key, idx) => {
    params[key.n] = matches[idx + 1];
  });
  return params;
};

/**
 * query - convert a URL.SearchParams object to a regular object
 * assumes a single-item-array should be a value, not an array
 *
 * @param {Object} searchParams
 */
const query = (searchParams) => {
  const query = {};
  for (const key of searchParams.keys()) {
    const vals = searchParams.getAll(key);
    query[key] = vals.length > 1 ? vals : vals[0];
  }
  return query;
};

/**
 * register - add this route and callback to our handler arrays
 *
 * @param {String} method
 * @param {String} route
 * @param {Function} f
 */
const response = (method, route, f) => {
  // p2r mutates the keys param, so it needs to exist beforehand
  let k = [];
  responses[method] = (responses[method] || []).concat({
    // regex
    r: p2r(route, k),
    // callback function(s)
    f,
    // keys
    k,
  });
};

// shortcuts for registering
const api = {
  get: (route, ...cbs) => response("GET", route, cbs),
  post: (route, ...cbs) => response("POST", route, cbs),
  put: (route, ...cbs) => response("PUT", route, cbs),
  del: (route, ...cbs) => response("DELETE", route, cbs),
  use: (method, route, ...cbs) => response(method, route, cbs),
};

// keep track of if we've called the callback
// because if the worker is kept around (i.e. not restarted)
// we don't want to re-register all the responses
let callbackCalled = false;

/**
 * constructor - set up the addEventListener and route handlers
 */
return (callback) => {
  addEventListener("fetch", (event) => {
    if (!callbackCalled) {
      callback(api);
      callbackCalled = true;
    }
    event.respondWith(handle(event.request));
  });
};

})();