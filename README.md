# Tini

A tiny web framework

# Usage

```
// handle a GET request
// also supports
// - .post
// - .put
// - .del
t.get('/my/get/route/:myParam',
  // middleware to process requests
  // the fist non-undefined return value is used as the response
  // this return value can come from any function in the chain
  req => {
    req.intermediateValue = 'somevalue';
    if (!req.query.secret === 'mysecret') {
      return new Response('Unauthorized', { status: 401 });
    }
  },
  req => {
  // send text
  return 'hello';

  // send json
  return { hello: 'world' };

  // send a raw Response
  return fetch(req.url);

  // send a Promise
  return Promise.resolve('hello, world');

  // path params
  console.log(req.params.myParam);

  // url search params
  // req.url = https://example.com/?q1=one
  console.log(req.query.q1);
});
```

for routing documentation, see [path-to-regexp](https://github.com/pillarjs/path-to-regexp#readme)

Released under the MIT License
