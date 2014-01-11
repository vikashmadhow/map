// Map jasmine unit tests
// @author Vikash Madhow <vikash.madhow@gmail.com>
// @license MIT
// @version 0.1.0
'use strict';

(function(root, spec) {
  if (typeof define === "function" && define.amd) {
    // client-side with requireJs
    define(["domReady!", "app/map.min"], spec);
  }
  else {
    // client-side without require JS
    window.addEventListener('DOMContentLoaded', function() {
      spec(document, root.__vm__.util.Map);
    });
  }
})(this, function(document, Map) {
  
  describe('Map', function() {

    var map;

    beforeEach(function() {
      map = new Map({a: "A", b: "B", c: "C"});
    });

    it('allows get/put with object keys following the key structure specified on creation', function() {
      expect(map.get({a: "One", b: "Two", c: "Three"})).toBeUndefined();
      map.put({a: "One", b: "Two", c: "Three"}, "Four");
      expect(map.get({a: "One", b: "Two", c: "Three"})).toEqual("Four");
      
      map.put("1/2/3", "4");
      map.put("1/2/4", "5");
      map.put("5/6/7", "8");
      map.put("Five/Six/Seven", "Eight");
      
      expect(map.get("One/Two/Three")).toEqual("Four");
      expect(map.get("1/2/3")).toEqual("4");
      expect(map.get("1/2/4")).toEqual("5");
      expect(map.get("5/6/7")).toEqual("8");
      expect(map.get("Five/Six/Seven")).toEqual("Eight");
    });
    
    // Test default values (simple and function)
    it('allows default values in get', function() {
      map.put("A/B/C", "D");
      expect(map.get("A/B/C", "E")).toEqual("D");
      expect(map.get("A/B/D", "E")).toEqual("E");
      expect(map.get("A/B/D", function() { return this.get("A/B/C"); } )).toEqual("D");
    });
    
    // Test default values with automatic update (simple and function)
    it('auto-updates on key not found', function() {
      map.put("A/B/C", "D");
      expect(map.get("A/B/C", "E")).toEqual("D");
      expect(map.getOrElseUpdate("A/B/D", "E")).toEqual("E");
      expect(map.getOrElseUpdate("A/B/F", function() { return this.get("A/B/D"); } )).toEqual("E");
      
      expect(map.get("A/B/D")).toEqual("E");
      expect(map.get("A/B/F")).toEqual("E");
    });
    
    it('fully supports string keys (incl. with escaped codes)', function() {
      map.put({a: "On/e", b: "Tw:o", c: "Thre\\e"}, "Four");
      expect(map.get({a: "On/e", b: "Tw:o", c: "Thre\\e"})).toEqual("Four");
      expect(map.get("On\\/e/Tw\\:o/Thre\\e")).toEqual("Four");
      expect(map.get("On\\/e/c:Thre\\e/b:Tw\\:o")).toEqual("Four");
    });
    
    it('allows selection of sub-maps', function() {
      map.put({a: "One", b: "Two", c: "Three"}, "Four");
      expect(map.select({a: "One"}).get({b: "Two", c: "Three"})).toEqual("Four"); 
      expect(map.select({a: "One", b: "Two"}).get({c: "Three"})).toEqual("Four"); 
      expect(map.select({a: "One", b: "Two", c: "Three"})).toEqual("Four"); 
    });
    
    it('auto-creates sub-maps on selection', function() {
      expect(map.select("A/B/C")).toBeUndefined();
    
      var submap = map.select("A/B");
      expect(submap).not.toBeUndefined();
      expect(submap.size()).toEqual(0);
      
      submap.put("C", "D");
      expect(submap.size()).toEqual(1);
      expect(map.size()).toEqual(1);
      expect(submap.get("C")).toEqual("D");
      expect(map.get("A/B/C")).toEqual("D");
    });

    it('increases in size with each put with distinct keys', function() {
      expect(map.size()).toEqual(0);
      map.put({a: "One", b: "Two", c: "Three"}, "Four");
      expect(map.size()).toEqual(1);
      map.put({a: "One", b: "Two", c: "Four"}, "Four");
      expect(map.size()).toEqual(2);
    });
    
    it('does not increase in size when the different values are associated with the same key', function() {
      expect(map.size()).toEqual(0);
      map.put({a: "One", b: "Two", c: "Three"}, "Four");
      expect(map.size()).toEqual(1);
      map.put({a: "One", b: "Two", c: "Three"}, "Five");
      expect(map.size()).toEqual(1);
    });
    
    it('Returns the previous associated value when a key-value is replaced/removed', function() {
      var replaced = map.put({a: "One", b: "Two", c: "Three"}, "Four");
      expect(replaced).toBeUndefined();
      replaced = map.put({a: "One", b: "Two", c: "Three"}, "Five");
      expect(replaced).toEqual("Four");
      
      var removed = map.remove({a: "One", b: "Two", c: "Three"});
      expect(removed).toEqual("Five");
      removed = map.remove({a: "One", b: "Two", c: "Three"});
      expect(removed).toBeUndefined();
      
      replaced = map.put({a: "One", b: "Two", c: "Three"}, "Five");
      expect(replaced).toBeUndefined();
    });
    
    it('keeps the size of its sub-maps consistent when keys are added to the parent map', function() {
      expect(map.size()).toEqual(0);
      map.put({a: "A", b: "B", c: "C"}, "D");
      expect(map.size()).toEqual(1);
      expect(map.select("A").size()).toEqual(1);
      expect(map.select("A/B").size()).toEqual(1);
      
      map.put({a: "A", b: "C", c: "C"}, "D");
      expect(map.size()).toEqual(2);
      expect(map.select("A").size()).toEqual(2);
      expect(map.select("A/B").size()).toEqual(1);
      expect(map.select("A/C").size()).toEqual(1);
    });
    
    it('keeps the size of the parent map consistent when keys are added to a sub-map', function() {
      expect(map.size()).toEqual(0);
      map.put({a: "A", b: "B", c: "C"}, "D");
      expect(map.size()).toEqual(1);
      expect(map.select("A").size()).toEqual(1);
      expect(map.select("A/B").size()).toEqual(1);
      
      var submap = map.select("A/B");
      submap.put("D", "E");
      expect(submap.size()).toEqual(2);
      expect(map.size()).toEqual(2);
      
      submap.remove("D");
      expect(submap.size()).toEqual(1);
      expect(map.size()).toEqual(1);
    });
    
    it('supports removal of keys', function() {
      expect(map.get({a: "One", b: "Two", c: "Three"})).toBeUndefined();
      map.put({a: "One", b: "Two", c: "Three"}, "Four");
      map.put({a: "One", b: "Two", c: "Four"}, "Five");
      expect(map.get({a: "One", b: "Two", c: "Three"})).toEqual("Four");
      expect(map.get({a: "One", b: "Two", c: "Four"})).toEqual("Five");
      expect(map.size()).toEqual(2);

      map.remove({a: "One", b: "Two", c: "Three"});
      expect(map.get({a: "One", b: "Two", c: "Three"})).toBeUndefined();
      expect(map.size()).toEqual(1);

      map.remove({a: "One", b: "Two", c: "Four"});
      expect(map.get({a: "One", b: "Two", c: "Four"})).toBeUndefined();
      expect(map.size()).toEqual(0);
      
      map.remove({a: "One", b: "Two", c: "Four"});
      expect(map.get({a: "One", b: "Two", c: "Four"})).toBeUndefined();
      expect(map.size()).toEqual(0);
    });
    
    it('supports iteration', function() {
      map.put("1/2/3", "4");
      map.put("One/Two/Three", "Four");
      map.put("5/6/7", "8");
      map.put("Five/Six/Seven", "Eight");
      
      var keys = [], values = [];
      map.each(function(key, value, map) {
        keys.push(map.toStringKey(key));
        values.push(value);
      });
      
      expect(keys.length).toEqual(map.size());
      expect(values.length).toEqual(map.size());
      
      var expected = ["a:1/b:2/c:3", "a:One/b:Two/c:Three", "a:5/b:6/c:7", "a:Five/b:Six/c:Seven"];
      for (var i = 0; i < keys.length; i++) {
        expect(expected).toContain(keys[i]);
      }

      expected = ["4", "Four", "8", "Eight"];
      for (var i = 0; i < values.length; i++) {
        expect(expected).toContain(values[i]);
      }
    });

    // test string key to object form
    it('converts string keys to object form', function() {
      expect(map.toObjectKey("A/B/C")).toEqual({a: "A", b: "B", c: "C"});
      expect(map.toObjectKey("b:A/a:B/C")).toEqual({a: "B", b: "A", c: "C"});
      expect(map.toObjectKey("a\\:A/b\\/B/c\\:\\/C")).toEqual({a: "a:A", b: "b/B", c: "c:/C"});
    });
    
    // test object key to string form
    it('converts object keys to string form', function() {
      expect(map.toStringKey({a: "A", b: "B", c: "C"}, false)).toEqual("A/B/C");
      expect(map.toStringKey({a: "B", b: "A", c: "C"})).toEqual("a:B/b:A/c:C");
      expect(map.toStringKey({a: "B", b: "A", c: "C"}, true)).toEqual("a:B/b:A/c:C");
      expect(map.toStringKey({a: "a:A", b: "b/B", c: "c:/C"}, false)).toEqual("a\\:A/b\\/B/c\\:\\/C");
      expect(map.toStringKey({a: "a:A", b: "b/B", c: "c:/C"}, true)).toEqual("a:a\\:A/b:b\\/B/c:c\\:\\/C");
    });
    
    // test clear
    it('supports clearing of the whole map', function() {
      map.put("1/2/3", "4");
      map.put("One/Two/Three", "Four");
      map.put("5/6/7", "8");
      map.put("Five/Six/Seven", "Eight");
      expect(map.size()).toEqual(4);
      
      map.clear();
      expect(map.size()).toEqual(0);
      expect(map.get("Five/Six/Seven")).toBeUndefined();
    });
    
    // test consistency of clear on sub-map
    it('supports consistent clearing of sub-maps', function() {
      map.put("1/2/3", "4");
      map.put("1/2/4", "5");
      map.put("One/Two/Three", "Four");
      map.put("5/6/7", "8");
      map.put("5/7/6", "8");
      map.put("Five/Six/Seven", "Eight");
      expect(map.size()).toEqual(6);
      
      var submap = map.select("1/2");
      expect(submap.size()).toEqual(2);
      expect(submap.get("3")).toEqual("4");
      expect(submap.get("4")).toEqual("5");
      submap.clear();
      expect(submap.size()).toEqual(0);
      expect(map.size()).toEqual(4);
      expect(submap.get("3")).toBeUndefined();
      expect(map.get("1/2/3")).toBeUndefined();
      expect(map.select("1/2").get("3")).toBeUndefined();
    });
    
  });  
});
