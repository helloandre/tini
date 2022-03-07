/**
 * Tini - A mini web framework to handle routing and response
 * specifically designed to work with Cloudflare Workers
 */
import { MatchFunction } from "path-to-regexp";
export declare type TiniRouterCallback = (router: InstanceType<typeof Router>) => void;
export interface TiniRequest extends Request {
    pathname: string;
    params: object;
    query: object;
}
export declare type Callback = (req: TiniRequest) => CallbackReturnValue;
export declare type CallbackReturnValue = InstanceType<typeof Response> | string | object | void;
declare type TiniRoute = {
    matcher: MatchFunction;
    callbacks: Callback[];
};
declare type CalculatedRoutes = {
    [method: string]: TiniRoute[];
};
export declare class Router {
    private routes;
    private pathPrefix;
    private preCallbacks;
    constructor(prefix: string, ...callbacks: Callback[]);
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
    route(method: string, route: string, ...callbacks: Callback[]): void;
    /**
     * add a recursive router
     *
     * @param router
     */
    with(router: Router): void;
    /**
     * flatten any nested Router routes
     */
    calculateRoutes(): CalculatedRoutes;
    private _addRoute;
}
declare const _default: (callback: TiniRouterCallback) => void;
export default _default;
