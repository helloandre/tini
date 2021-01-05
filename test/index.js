const test = require("../dist/test");
const testMin = require("../dist/test.min");
const { expect } = require("chai");

const SUPPORTED_VERBS = [
  {
    func: "get",
    verb: "GET",
  },
  {
    func: "post",
    verb: "POST",
  },
  {
    func: "put",
    verb: "PUT",
  },
  {
    func: "del",
    verb: "DELETE",
  },
];
const TEST_VERSIONS = [
  {
    version: "unminified",
    var: test,
  },
  {
    version: "minified",
    var: testMin,
  },
];

TEST_VERSIONS.forEach((tester) => {
  describe(`tini ${tester.version}`, function () {
    beforeEach(function () {
      global.forceAllowCallback = true;

      this.run = function (method, url) {
        tester.var.trigger("fetch", {
          request: { method, url },
          respondWith: (res) => (this.res = res),
        });
      };
    });

    it("should support req.params", function () {
      tester.var.tini((t) => {
        t.get("/test/:userId/:p?", (req) => req.params.userId);
      });

      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");

      return this.res.then((data) => {
        expect(data.data).to.equal("firstParam");
      });
    });

    it("should support req.query", function () {
      tester.var.tini((t) => {
        t.get("/test/:userId/:p?", (req) => req.query.q1);
      });

      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");

      return this.res.then((data) => {
        expect(data.data).to.equal("one");
      });
    });

    it("should initiate calbacks only once ever", function () {
      let count = 0;
      tester.var.tini((t) => {
        global.forceAllowCallback = false;
        t.get("/test/:userId/:p?", (req) => req.query.q1);
        count++;
      });

      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");
      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");

      return this.res.then((data) => {
        expect(data.data).to.equal("one");
        expect(count).to.equal(1);
      });
    });

    it("meta test: forceAllowCallback", function () {
      let count = 0;
      tester.var.tini((t) => {
        t.get("/test/:userId/:p?", (req) => req.query.q1);
        count++;
      });

      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");
      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");

      return this.res.then((data) => {
        expect(data.data).to.equal("one");
        expect(count).to.equal(2);
      });
    });

    it("use() supports OPTIONS", function () {
      tester.var.tini((t) => {
        t.use("OPTIONS", "(.*)", (req) => "yes");
      });

      this.run("OPTIONS", "https://andre.blue/test");

      return this.res.then((data) => {
        expect(data.data).to.equal("yes");
      });
    });

    SUPPORTED_VERBS.forEach(({ func, verb }) => {
      describe(`.${func}`, function () {
        it("should support returning a string", function () {
          tester.var.tini((t) => {
            t[func]("/test/:userId/:p?", (req) => "string");
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then((data) => {
            expect(data.data).to.equal("string");
          });
        });

        it("should support returning json", function () {
          tester.var.tini((t) => {
            t[func]("/test/:userId/:p?", (req) => ({ done: "yes" }));
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then((data) => {
            expect(data.data).to.equal('{"done":"yes"}');
          });
        });

        it("should support returning a Response", function () {
          tester.var.tini((t) => {
            t[func](
              "/test/:userId/:p?",
              (req) => new tester.var.Response("response")
            );
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then((data) => {
            expect(data.data).to.equal("response");
          });
        });

        it("should support returning a Promise", function () {
          tester.var.tini((t) => {
            t[func]("/test/:userId/:p?", (req) => Promise.resolve("promise"));
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then((data) => {
            expect(data.data).to.equal("promise");
          });
        });

        it("should support middleware", function () {
          tester.var.tini((t) => {
            t[func](
              "/test/:parseable",
              (req) => {
                req.intermediateValue = req.params.parseable.split(",");
              },
              (req) => req.intermediateValue.join(",")
            );
          });

          this.run(verb, "https://andre.blue/test/one,two,three");

          return this.res.then((data) => {
            expect(data.data).to.equal("one,two,three");
          });
        });

        it("should return early from middleware", function () {
          tester.var.tini((t) => {
            t[func](
              "/test/",
              (req) => "early",
              (req) => "late"
            );
          });

          this.run(verb, "https://andre.blue/test/");

          return this.res.then((data) => {
            expect(data.data).to.equal("early");
          });
        });

        it("should not match subset path on 404", function () {
          tester.var.tini((t) => {
            t[func]("/test", () => "no");
          });

          this.run(verb, "https://andre.blue/test/one");

          return this.res.then((data) => {
            expect(data.data).to.equal("Not Found");
          });
        });
      });
    });
  });
});
