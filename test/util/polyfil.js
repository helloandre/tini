/**
 * For testing purposes, we "fake" addEventListener
 * and call the callback immediately
 *
 * @param {String} evtStr
 * @param {Function} cb
 */
const listenedEvents = {};
function addEventListener(evtStr, cb) {
  listenedEvents[evtStr] = cb;
}

/**
 * simple triggering for listened events
 *
 * @param {String} evtStr
 * @param {Object} event
 */
function trigger(evtStr, event) {
  return listenedEvents[evtStr](event);
}

function Response(data, opts) {
  this.data = data;
  this.opts = opts;
}
function Headers() {}
Headers.prototype.append = () => {};
