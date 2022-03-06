/**
 * Tini - A mini web framework to handle routing and response
 * specifically designed to work with Cloudflare Workers
 */
import { match, MatchFunction } from "path-to-regexp";
import { URLSearchParams } from "url";

export type TiniRouterCallback = (router: InstanceType<typeof TiniRouter>, tini: InstanceType<typeof Tini>) => void;
export interface TiniRequest extends Request {
  pathname: string,
  params: object,
  query: object,
};

export type Callback = (req: TiniRequest) => CallbackReturnValue;
export type CallbackReturnValue = InstanceType<typeof Response> | string | { success: boolean } | void;

export type RouteObj = {
  matcher: MatchFunction,
  callbacks: Callback[]
}

/**
 * query - convert a URL.SearchParams object to a regular object
 * assumes a single-item-array should be a value, not an array
 */
function query(searchParams: URLSearchParams) {
  const query: { [key: string]: string | string[] } = {};
  for (const key of searchParams.keys()) {
    const vals = searchParams.getAll(key);
    query[key] = vals.length > 1 ? vals : vals[0];
  }
  return query;
};

class TiniRouter {
  routes: { [method: string]: RouteObj[] } = {}
  pathPrefix: string = ""
  preCallbacks: Callback[] = []

  constructor(prefix: string, callbacks: Callback[]) {
    this.pathPrefix = prefix;
    this.preCallbacks = callbacks;
  }

  /**
   * helpers to support "typical" use cases
   */
  get(route: string, ...callbacks: Callback[]) { this._addRoute("GET", route, callbacks) }
  post(route: string, ...callbacks: Callback[]) { this._addRoute("POST", route, callbacks) }
  put(route: string, ...callbacks: Callback[]) { this._addRoute("PUT", route, callbacks) }
  del(route: string, ...callbacks: Callback[]) { this._addRoute("DELETE", route, callbacks) }

  /**
   * Poweruser method to support arbitrary HTTP methods
   */
  use(method: string, route: string, ...callbacks: Callback[]) { this._addRoute(method, route, callbacks) }

  /**
   * 
   * @param method 
   * @param route 
   * @param callbacks 
   */

  _addRoute(method: string, route: string, callbacks: Callback[]) {
    this.routes[method] = (this.routes[method] || []).concat({
      matcher: match(`${this.pathPrefix}${route}`, { decode: decodeURIComponent }),
      callbacks: this.preCallbacks.concat(callbacks),
    });
  }
}

class Tini {
  routers: TiniRouter[] = [];

  with(prefix: string = "", ...callbacks: Callback[]) {
    const router = new TiniRouter(prefix, callbacks);
    this.routers.push(router);
    return router;
  }

  /**
  * iterate through all routes registered and find the first matching one
  */
  async _handle(req: TiniRequest): Promise<Response> {
    const routes = this.routers.reduce((acc, r) => acc.concat(r.routes[req.method] || []), []);

    if (!routes.length) {
      return new Response("Not Found", { status: 404 });
    }

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
            // support 3 types of values for response:
            // 1. Response
            if (result instanceof Response) {
              return result;
            }

            // 2. String
            if (typeof result === "string") {
              return new Response(result);
            }

            // 3. JSON
            const headers = new Headers({});
            headers.append("Content-Type", "application/json");
            return new Response(JSON.stringify(result), { headers });
          }
        }
      }
    }
  }
}

export default (callback: TiniRouterCallback) => {
  const tini = new Tini();
  callback(tini.with(), tini);
  addEventListener("fetch", (event: FetchEvent) => {
    event.respondWith(tini._handle(event.request as TiniRequest));
  });
};
