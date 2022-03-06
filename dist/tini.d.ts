/**
 * Tini - A mini web framework to handle routing and response
 * specifically designed to work with Cloudflare Workers
 */
import { MatchFunction } from "path-to-regexp";
export declare type TiniRouterCallback = (router: InstanceType<typeof TiniRouter>, tini: InstanceType<typeof Tini>) => void;
export interface TiniRequest extends Request {
    pathname: string;
    params: object;
    query: object;
}
export declare type Callback = (req: TiniRequest) => CallbackReturnValue;
export declare type CallbackReturnValue = InstanceType<typeof Response> | string | {
    success: boolean;
} | void;
export declare type RouteObj = {
    matcher: MatchFunction;
    callbacks: Callback[];
};
declare class TiniRouter {
    routes: {
        [method: string]: RouteObj[];
    };
    pathPrefix: string;
    preCallbacks: Callback[];
    constructor(prefix: string, callbacks: Callback[]);
    /**
     * helpers to support "typical" use cases
     */
    get(route: string, ...callbacks: Callback[]): void;
    post(route: string, ...callbacks: Callback[]): void;
    put(route: string, ...callbacks: Callback[]): void;
    del(route: string, ...callbacks: Callback[]): void;
    /**
     * Poweruser method to support arbitrary HTTP methods
     */
    use(method: string, route: string, ...callbacks: Callback[]): void;
    /**
     *
     * @param method
     * @param route
     * @param callbacks
     */
    _addRoute(method: string, route: string, callbacks: Callback[]): void;
}
declare class Tini {
    routers: TiniRouter[];
    with(prefix?: string, ...callbacks: Callback[]): TiniRouter;
    /**
    * iterate through all routes registered and find the first matching one
    */
    _handle(req: TiniRequest): Promise<Response>;
}
declare const _default: (callback: TiniRouterCallback) => void;
export default _default;
