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
    r: p2r(route, k, { end: true }),
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
