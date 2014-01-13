// Jasmine custom matchers are kept in this file to facilitate re-use.
// @author Vikash Madhow <vikash.madhow@gmail.com>
// @license MIT
// @version 0.2.0
'use strict';

(function(root, matchers) {
  if (typeof define === "function" && define.amd) {
    // client-side with requireJs
    define(matchers);
  }
  else {
    // client-side without AMD. Register in a global namespace __vm__ as __vm__.util.test.customMatchers
    root.__vm__ = root.__vm__ || {};
    root.__vm__.util = root.__vm__.util || {};
    root.__vm__.util.test = root.__vm__.util.test || {};
    root.__vm__.util.test.customMatchers = matchers();    
  }
})(this, function() {
  return function(jasmine) {
    jasmine.addMatchers({
     
      // Return true if two arrays have the same contents, irrespective of order.
      toContainAll: function(expected) {
        var actual = this.actual;
        var notText = this.isNot ? " not" : "";
        
        if (Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length) {
          var ex = expected.slice();
          for (var i = 0; i < actual.length; i++) {
            var index = ex.indexOf(actual[i]);
            if (index < 0) return false;
            else           ex.splice(index, 1);
          }
          return ex.length === 0;
        }
        else return false;

        // failure message
        this.message = function () {
          return !Array.isArray(actual)   ? actual + " is not an array" :
                 !Array.isArray(expected) ? expected + " is not an array" :
                 actual.length !== expected.length ? actual + " does not have the same number of elements as " + expected :
                 "Expected " + actual + notText + " to contain all elements in " + expected;
        }
      },
      
      // Return true if two arrays have same contents
      toBeEqualArrayTo: function(expected) {
        var actual = this.actual;
        var notText = this.isNot ? " not" : "";
        
        if (Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length) {
          for (var i = 0; i < actual.length; i++) {
            if (actual[i] !== expected[i]) 
              return false;
          }
          return true;
        }
        else return false;

        // failure message
        this.message = function () {
          return !Array.isArray(actual)   ? actual + " is not an array" :
                 !Array.isArray(expected) ? expected + " is not an array" :
                 actual.length !== expected.length ? actual + " does not have the same number of elements as " + expected :
                 "Expected " + actual + notText + " to be equal to " + expected;
        }
      }
    });
  }
});