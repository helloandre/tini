/**
 * included below is a modified version of path-to-regexp
 * does not include:
 *  - compile
 *  - tokensToFunction
 *  - arrays
 */

/**
 * Default configs.
 */
var DEFAULT_DELIMITER = "/";
var DEFAULT_DELIMITERS = "./";

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp(
  [
    // Match escaped characters that would otherwise appear in future matches.
    // This allows the user to escape special characters that won't transform.
    "(\\\\.)",
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // ":test(\\d+)?" => ["test", "\d+", undefined, "?"]
    // "(\\d+)"  => [undefined, undefined, "\d+", undefined]
    "(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?"
  ].join("|"),
  "g"
);

const l = arr => arr.length;

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
const parse = (str, options = {}) => {
  const tokens = [];
  const defaultDelimiter = (delimiters =
    options.delimiter || DEFAULT_DELIMITER);
  let key = 0;
  let index = 0;
  let pathEscaped = false;
  let res;
  let path = "";

  while ((res = PATH_REGEXP.exec(str)) !== null) {
    const [m, escaped, name, capture, group, modifier] = res;
    const offset = res.index;
    const next = str[index];
    let prev = "";

    path += str.slice(index, offset);
    index = offset + l(m);

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      pathEscaped = true;
      continue;
    }

    if (!pathEscaped && l(path)) {
      var k = l(path) - 1;

      if (delimiters.indexOf(path[k]) > -1) {
        prev = path[k];
        path = path.slice(0, k);
      }
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = "";
      pathEscaped = false;
    }

    var partial = prev !== "" && next !== undefined && next !== prev;
    var repeat = modifier === "+" || modifier === "*";
    var optional = modifier === "?" || modifier === "*";
    var delimiter = prev || defaultDelimiter;
    var pattern = capture || group;

    tokens.push({
      n: name || key++,
      v: prev,
      d: delimiter,
      o: optional,
      r: repeat,
      l: partial,
      a: pattern
        ? pattern.replace(/([=!:$/()])/g, "\\$1")
        : "[^" + escapeString(delimiter) + "]+?"
    });
  }

  // Push any remaining characters.
  if (path || index < l(str)) {
    tokens.push(path + str.substr(index));
  }

  return tokens;
};

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
const escapeString = str => {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
};

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {Array=}  keys
 * @return {!RegExp}
 */
const regexpToRegexp = (path, keys) => {
  if (!keys) return path;

  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < l(groups); i++) {
      keys.push({
        n: i,
        v: null,
        d: null,
        o: false,
        r: false,
        l: false,
        a: null
      });
    }
  }

  return path;
};

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
const tokensToRegExp = (tokens, keys, options = {}) => {
  var strict = options.strict;
  var delimiter = escapeString(options.delimiter || DEFAULT_DELIMITER);
  var delimiters = options.delimiters || DEFAULT_DELIMITERS;
  var endsWith = (options.endsWith || [])
    .map(escapeString)
    .concat("$")
    .join("|");
  var route = options.start ? "^" : "";
  var isEndDelimited = l(tokens) === 0;

  // Iterate over the tokens and create our regexp string.
  tokens.map((token, i) => {
    if (typeof token === "string") {
      route += escapeString(token);
      isEndDelimited =
        i === l(tokens) - 1 && delimiters.indexOf(token[l(token) - 1]) > -1;
    } else {
      var capture = token.r
        ? "(?:" +
          token.a +
          ")(?:" +
          escapeString(token.d) +
          "(?:" +
          token.a +
          "))*"
        : token.a;

      if (keys) keys.push(token);

      if (token.o) {
        route += token.l
          ? escapeString(token.v) + "(" + capture + ")?"
          : "(?:" + escapeString(token.v) + "(" + capture + "))?";
      } else {
        route += escapeString(token.v) + "(" + capture + ")";
      }
    }
  });

  if (options.end) {
    if (!strict) route += "(?:" + delimiter + ")?";

    route += endsWith === "$" ? "$" : "(?=" + endsWith + ")";
  } else {
    if (!strict) route += "(?:" + delimiter + "(?=" + endsWith + "))?";
    if (!isEndDelimited) route += "(?=" + delimiter + "|" + endsWith + ")";
  }

  return new RegExp(route, options.sensitive ? "" : "i");
};

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {Array=}                keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
return (path, keys, options) =>
  path instanceof RegExp
    ? regexpToRegexp(path, keys)
    : tokensToRegExp(parse(path, options), keys, options);
