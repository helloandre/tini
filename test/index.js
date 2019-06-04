const test = require("../dist/test");
const testMin = require("../dist/test.min");
const { expect } = require("chai");

const SUPPORTED_VERBS = [
  {
    func: "get",
    verb: "GET"
  },
  {
    func: "post",
    verb: "POST"
  },
  {
    func: "put",
    verb: "PUT"
  },
  {
    func: "del",
    verb: "DELETE"
  }
];
const TEST_VERSIONS = [
  {
    version: "unminified",
    var: test
  },
  {
    version: "minified",
    var: testMin
  }
];

TEST_VERSIONS.forEach(tester => {
  describe(`tini ${tester.version}`, function() {
    beforeEach(function() {
      // reset tini
      tester.var.t.reset();

      this.run = function(method, url) {
        this.res = tester.var.trigger("fetch", {
          request: { method, url },
          respondWith: res => res
        });
      };
    });

    it("should support req.params", function() {
      tester.var.t.get("/test/:userId/:p?", req => {
        return req.params.userId;
      });

      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");

      return this.res.then(data => {
        expect(data.data).to.equal("firstParam");
      });
    });

    it("should support req.query", function() {
      tester.var.t.get("/test/:userId/:p?", req => {
        return req.query.q1;
      });

      this.run("GET", "https://andre.blue/test/firstParam/?q1=one");

      return this.res.then(data => {
        expect(data.data).to.equal("one");
      });
    });

    SUPPORTED_VERBS.forEach(({ func, verb }) => {
      describe(`.${func}`, function() {
        it("should support returning a string", function() {
          tester.var.t[func]("/test/:userId/:p?", req => {
            return "string";
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then(data => {
            expect(data.data).to.equal("string");
          });
        });

        it("should support returning json", function() {
          tester.var.t[func]("/test/:userId/:p?", req => {
            return { done: "yes" };
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then(data => {
            expect(data.data).to.equal('{"done":"yes"}');
          });
        });

        it("should support returning a Response", function() {
          tester.var.t[func]("/test/:userId/:p?", req => {
            return new tester.var.Response("response");
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then(data => {
            expect(data.data).to.equal("response");
          });
        });

        it("should support returning a Promise", function() {
          tester.var.t[func]("/test/:userId/:p?", req => {
            return Promise.resolve("promise");
          });

          this.run(verb, "https://andre.blue/test/andre/?q1=one");

          return this.res.then(data => {
            expect(data.data).to.equal("promise");
          });
        });

        it("should support middleware", function() {
          tester.var.t[func](
            "/test/:parseable",
            req => {
              req.intermediateValue = req.params.parseable.split(",");
            },
            req => {
              return req.intermediateValue.join(",");
            }
          );

          this.run(verb, "https://andre.blue/test/one,two,three");

          return this.res.then(data => {
            console.log("data", data);
            expect(data.data).to.equal("one,two,three");
          });
        });
      });
    });
  });
});
