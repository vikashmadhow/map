/* boot jasmine through requirejs if available, normally otherwise.
 * @author: Vikash Madhow <vikash.madhow@gmail.com>
 * License: MIT
 */

(function(boot) {
  if (typeof define === "function" && define.amd) {
    define(["domReady!", "spec/mapSpec"], boot);
  }
  else {
    window.addEventListener("load", boot);
  }
})(function() {
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 250;

  var htmlReporter = new jasmine.HtmlReporter();

  jasmineEnv.addReporter(htmlReporter);

  jasmineEnv.specFilter = function(spec) {
    return htmlReporter.specFilter(spec);
  };

  jasmineEnv.execute();
});