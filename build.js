const fs = require("fs");
const minify = require("babel-minify");

const tini = fs.readFileSync("./src/tini.js", "utf8");
const p2r = fs.readFileSync("./src/path-to-regex.js", "utf8");
const polyfill = fs.readFileSync("./test/util/polyfil.js", "utf8");

const tiniTemplate = `const tini = (function(){\n${tini}\n})();`;
const p2rTemplate = `const p2r = (function(){\n${p2r}\n})();`;
const combinedTemplate = `${p2rTemplate}\n${tiniTemplate}`;

const testTemplate = `${polyfill}\n${combinedTemplate.replace(
  "callback(api)",
  "responses = {};\ncallback(api)"
)}\nmodule.exports = { tini, trigger, Response };`;

fs.writeFileSync(
  "./dist/index.js",
  combinedTemplate.replace("const tini =", "module.exports =")
);
fs.writeFileSync("./dist/index.min.js", minify(combinedTemplate).code);
fs.writeFileSync("./dist/test.js", testTemplate);
fs.writeFileSync("./dist/test.min.js", minify(testTemplate).code); // also test a minified version
