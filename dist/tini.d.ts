/**
 * Tini - A mini web framework to handle routing and response
 * specifically designed to work with Cloudflare Workers
 */
import { MatchFunction } from "path-to-regexp";
export declare type TiniRouter = (route: string, ...callbacks: Callback[]) => void;
export declare type TiniRouterCallback = (router: InstanceType<typeof Tini>) => void;
export interface TiniRequest extends Request {
    pathname: string;
    params: object;
    query: object;
}
export declare type Callback = (req: Request) => CallbackReturnValue;
export declare type CallbackReturnValue = InstanceType<typeof Response> | string | {
    success: boolean;
} | void;
export declare type ResponseObj = {
    matcher: MatchFunction;
    callbacks: Callback[];
};
export declare class Tini {
    responses: {
        [method: string]: ResponseObj[];
    };
    /**
     * helpers to support "typical" use cases
     */
    get(route: string, ...cbs: Callback[]): void;
    post(route: string, ...cbs: Callback[]): void;
    put(route: string, ...cbs: Callback[]): void;
    del(route: string, ...cbs: Callback[]): void;
    /**
     * Poweruser method to support arbitrary HTTP methods
     */
    use(method: string, route: string, ...cbs: Callback[]): void;
    _addRoute(method: string, route: string, callbacks: Callback[]): void;
    /**
    * iterate through all routes registered and find the first matching one
    */
    _handle(req: TiniRequest): Promise<Response>;
}
declare const _default: (callback: TiniRouterCallback) => void;
export default _default;
