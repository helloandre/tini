const makeServiceWorkerEnv = require("service-worker-mock");
const { expect } = require("chai");

const env = makeServiceWorkerEnv();
Object.assign(global, env, {
  // TODO figure out why just assigning env doesn't do this...
  addEventListener: env.addEventListener.bind(env),
});

const tini = require("../dist/index").default;

describe("tini", function () {
  beforeEach(function () {
    return new Promise((resolve) => {
      tini((router, t) => {
        this.router = router;
        this.tini = t;
        this.get = (path, route, cb) => {
          if (cb === undefined) {
            this.router.get("(.*)", route);
          } else {
            this.router.get(route, cb);
          }

          return this.trigger(new Request(`http://example.com${path}`));
        };
        this.trigger = (req) =>
          self.trigger("fetch", req).then((req) => req.json());
        resolve();
      });
    });
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
    this.router.use("GET", "/api", () => false);
    this.router.use("GET", "(.*)", () => true);

    return this.trigger(new Request("http://example.com/not")).then((res) => {
      expect(res).to.equal(true);
    });
  });

  it("should fall through to next route, specific suburl", function () {
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
    this.router.get("(.*)", () => "TEST_STRING");
    self
      .trigger("fetch", new Request("http://example.com"))
      .then((res) => res.text())
      .then((res) => {
        expect(res).to.equal("TEST_STRING");
      });
  });

  it("should support returning a Response", function () {
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

  it("should default to 404", function () {
    self
      .trigger("fetch", new Request("http://example.com/"))
      .then((res) => {
        expect(res.status).to.equal(404);
        return res.text();
      })
      .then((res) => {
        expect(res).to.equal("Not Found");
      });
  });

  describe("middleware", function () {
    it("should support not returning anything, adding to request", function () {
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

  describe("with", function () {
    it("should support prefixing path", function () {
      const router = this.tini.with("/api/v1");

      router.get("/:id", (req) => req.params);
      this.router.get("/not-an-api", () => ["TEST_NOT_API"]);

      return Promise.all([
        this.trigger(new Request("https://example.com/not-an-api")),
        this.trigger(new Request("https://example.com/api/v1/1234")),
      ]).then(([one, two]) => {
        expect(one).to.deep.equal(["TEST_NOT_API"]);
        expect(two).to.deep.equal({ id: "1234" });
      });
    });

    it("should support running callbacks on all child paths", function () {
      const router = this.tini.with("/api/v1", (req) => {
        req.TEST_ALL = "TEST_ALL";
      });

      router.get(
        "/:id",
        (req) => {
          req.TEST_GET = "TEST_GET";
        },
        (req) => [req.TEST_GET, req.TEST_ALL, req.params.id]
      );
      router.put(
        "/:id",
        (req) => {
          req.TEST_PUT = "TEST_PUT";
        },
        (req) => [req.TEST_PUT, req.TEST_ALL, req.params.id]
      );
      this.router.get("/not-an-api", (req) => ["TEST_NOT_API"]);

      return Promise.all([
        this.trigger(new Request("https://example.com/not-an-api")),
        this.trigger(new Request("https://example.com/api/v1/1234")),
        this.trigger(
          new Request("https://example.com/api/v1/1234", { method: "PUT" })
        ),
      ]).then(([one, two, three]) => {
        expect(one).to.deep.equal(["TEST_NOT_API"]);
        expect(two).to.deep.equal(["TEST_GET", "TEST_ALL", "1234"]);
        expect(three).to.deep.equal(["TEST_PUT", "TEST_ALL", "1234"]);
      });
    });
  });
});
