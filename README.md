# Tini

A tiny web framework

# Installation

- `npm i @helloandre/tini`

# API

## tini(fn)

a function that expects a function as it's only parameter, and is passed an object containing the routing api.

```
import tini from '@helloandre/tini'

tini(router => {
  router.get('/:key', req => req.params.key);
})
```

## Router

### Convenience methods

- **get(route: string, ...callbacks: Function)**
- **post(route: string, ...callbacks: Function)**
- **put(route: string, ...callbacks: Function)**
- **del(route: string, ...callbacks: Function)**
- **route(method: string, route: string, ...callbacks: Function)** - a generic catch all for any other methods you may need to support

### Nested Routers

- **with(router: Router)**

# Examples

For more in depth route path documentation, see [path-to-regexp](https://github.com/pillarjs/path-to-regexp#readme)

**Return String**

```
tini(router => {
  router.get('/someroute', req => {
    return 'Hello, World!';
  });
});
```

**Route Parameters + Query String**

```
// url: /myKey?p=1
tini(router => {
  router.get('/:key', req => {
    // outputs "myKey, 1"
    return `${req.params.key}, ${req.query.p}`;
  });
});
```

**Return JSON**

```
tini(router => {
  router.get('/someroute', req => {
    return { hello: 'world' };
  });
});
```

**Return A Promise**

```
tini(router => {
  router.get('/someroute', req => {
    return Promise.resolve('hello, world');
  });
});
```

**Return A Response**

```
tini(router => {
  router.get('/someroute', req => {
    return new Response("Not Found", { status: 404 });
  });
});
```

**Middleware**

```
tini(router => {
  router.get('/someroute',
    req => {
      req.intermediateValue = 'somevalue';

      if (req.query.secret !== 'mysecret') {
        return new Response('Unauthorized', { status: 401 });
      }
    },
    req => {
      return req.intermediateValue;
    }
  );
});
```

**Nested Routers**

```
tini(router => {
  const api = new TiniRouter(`/api/v1`);
  api.get('/:name', (req) => ({ params: req.params, query: req.query }));
  router.with(api);

  router.get('(.*)', () => new Response("Not Found", { status: 404 }));
});
```

# License

MIT
