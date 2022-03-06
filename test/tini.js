const makeServiceWorkerEnv = require("service-worker-mock");
const { expect } = require("chai");

const env = makeServiceWorkerEnv();
Object.assign(global, env, {
  // TODO figure out why just assigning env doesn't do this...
  addEventListener: env.addEventListener.bind(env),
});

const tini = require("../dist/tini");

describe("tini", function () {
  beforeEach(function () {
    this.router = new tini.Tini();
    this.trigger = (req) =>
      self.trigger("fetch", req).then((req) => req.json());
    this.listen = () => {
      addEventListener("fetch", (evt) => {
        evt.respondWith(this.router._handle(evt.request));
      });
    };
    this.get = (path, route, cb) => {
      if (cb === undefined) {
        this.router.get("(.*)", route);
      } else {
        this.router.get(route, cb);
      }

      this.listen();

      return this.trigger(new Request(`http://example.com${path}`));
    };
  });

  afterEach(function () {
    self.listeners.reset();
  });

  it("support query params", function () {
    return this.get("/?one=one", (req) => req.query).then((res) =>
      expect(res).to.deep.equal({ one: "one" })
    );
  });

  it("support path params", function () {
    this.get("/api/one", "/api/:id", (req) => req.params).then((res) => {
      expect(res).to.deep.equal({ id: "one" });
    });
  });

  it("support url and query params", function () {
    this.get("/api/one?one=two", "/api/:id", (req) => ({
      params: req.params,
      query: req.query,
    })).then((res) => {
      expect(res.params).to.deep.equal({ id: "one" });
      expect(res.query).to.deep.equal({ one: "two" });
    });
  });

  it("should fall through to next route", function () {
    this.listen();
    this.router.use("GET", "/api", () => false);
    this.router.use("GET", "(.*)", () => true);

    return this.trigger(new Request("http://example.com/not")).then((res) => {
      expect(res).to.equal(true);
    });
  });

  it("should fall through to next route, specific suburl", function () {
    this.listen();
    this.router.get("/api", () => false);
    this.router.get("/api/one", () => false);
    this.router.get("/api/:id", (req) => req.params);

    return this.trigger(new Request("http://example.com/api/nomatch")).then(
      (res) => {
        expect(res).to.deep.equal({ id: "nomatch" });
      }
    );
  });

  it("should not fall through to next route on different method", function () {
    this.listen();
    this.router.get("/api", () => false);
    this.router.post("(.*)", () => false);
    this.router.get("(.*)", () => true);

    return this.trigger(new Request("http://example.com/not")).then((res) => {
      expect(res).to.equal(true);
    });
  });

  it("should support returning json", function () {
    return this.get("/", () => ({ success: true })).then((res) =>
      expect(res).to.deep.equal({ success: true })
    );
  });

  it("should support returning a string", function () {
    this.listen();
    this.router.get("(.*)", () => "TEST_STRING");
    self
      .trigger("fetch", new Request("http://example.com"))
      .then((res) => res.text())
      .then((res) => {
        expect(res).to.equal("TEST_STRING");
      });
  });

  it("should support returning a Response", function () {
    this.listen();
    this.router.get(
      "(.*)",
      () =>
        new Response("TEST_RESPONSE", {
          status: 404,
          headers: new Headers({ "Content-Type": "text/html" }),
        })
    );
    self
      .trigger("fetch", new Request("http://example.com"))
      .then((res) => {
        expect(res.status).to.equal(404);
        expect(res.headers.get("Content-Type")).to.equal("text/html");
        return res.text();
      })
      .then((res) => {
        expect(res).to.equal("TEST_RESPONSE");
      });
  });

  it("should support returning a Promise", function () {
    this.get("/", () => Promise.resolve({ success: true })).then((res) =>
      expect(res).to.deep.equal({ success: true })
    );
  });

  describe("middleware", function () {
    it("should support not returning anything, adding to request", function () {
      this.listen();
      this.router.get(
        "(.*)",
        (req) => {
          req.TEST_STRING = "TEST_STRING";
        },
        (req) => req.TEST_STRING
      );

      self
        .trigger("fetch", new Request("http://example.com/"))
        .then((res) => res.text())
        .then((res) => {
          expect(res).to.equal("TEST_STRING");
        });
    });

    it("should support middleware returning early", function () {
      this.listen();
      this.router.get(
        "(.*)",
        () => false,
        () => true
      );

      this.trigger(new Request("http://example.com/")).then((res) => {
        expect(res).to.equal(false);
      });
    });
  });

  describe("default behavior", function () {
    it("should handle a 'fetch' event", function () {
      tini.default((router) => {
        router.get("(.*)", () => ({ success: true }));
      });
      this.trigger(new Request("http://example.com")).then((res) => {
        expect(res).to.deep.equal({ success: true });
      });
    });
  });
});
