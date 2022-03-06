# Tini

A tiny web framework with zero dependencies

# Installation

- `npm i @helloandre/tini`

# API

### tini(fn)

a function that expects a function as it's only parameter, and is passed an object containing the routing api.

```
import tini from '@helloandre/tini'

tini(router => {
  router.get('/:key', req => req.params.key);
})
```

### router

The router has four methods, all of which accept a string as the first parameter, and an arbitrary number of callbacks.

The output to the client is the first return value from a callback that is a non-`undefined` value.

- **get(route: String, ...callbacks: Function)**
- **post(route: String, ...callbacks: Function)**
- **put(route: String, ...callbacks: Function)**
- **del(route: String, ...callbacks: Function)**
- **use(method: String, route: String, ...callbacks: Function)** - a generic catch all for any other methods you may need to support

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
    return fetch(req.url);
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

# License

MIT
