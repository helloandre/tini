module.exports = (function(){
/**
 * Tini - A mini web framework to handle routing and response
 * specifically designed to work with Cloudflare Workers
 */
const { match } = require("path-to-regexp");
const tiniMatch = (path) => match(path, { decode: decodeURIComponent });

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
  const url = new URL(req.url);

  // iterate over all potential routes in the order they were added
  for (const { matcher, callbacks } of routes) {
    const matches = matcher(url.pathname);

    // we always return inside this block
    // which means that only the first matching route executes
    if (matches) {
      // set the values that may be needed on req
      req.pathname = url.pathname;
      req.params = matches.params;
      req.query = query(url.searchParams);

      // iterate through all the callbacks
      // returning the first non-null response
      for (const cb of callbacks) {
        // resolve any promises first if res is a promise
        const result = await Promise.resolve(cb(req));
        if (result !== undefined) {
          // support 3 types of values for res:
          // 1. Response
          if (result instanceof Response) {
            return result;
          }

          // 2. String
          if (typeof result === "string") {
            return new Response(result);
          }

          // 3. JSON
          const headers = new Headers();
          headers.append("Content-Type", "application/json");
          return new Response(JSON.stringify(result), { headers });
        }
      }
    }
  }

  // fallback in case nothing matches this route
  return new Response("Not Found", { status: 404 });
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
const response = (method, route, callbacks) => {
  responses[method] = (responses[method] || []).concat({
    matcher: tiniMatch(route),
    callbacks,
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