/** @module Map
  * @desc This module exports the {@link module:Map.Map} class which implements
  * a simple technique for creating a multi-key map in Javascript.
  *
  * Javascript arrays ([]) and objects ({}) can have objects as keys but, behind the scenes,
  * only string keys are supported. Objects are converted to string form by
  * invoking their toString() method before being used as keys. This is often not
  * the desired behaviour.
  *
  * Instead of being a full-blown hash map which would require a hashing function
  * to be implemented for all objects, this class instead uses the properties of
  * an object to create a multi-level array where each property is used as a key
  * at a specific level.
  *
  * Suppose a Map is created with the key structure `{a: "a", b: "b", c: "c"}`
  * (the property values are irrelevant, only their names are used), this class will
  * use a 3-levels object with property *a* indexing the 1<sup>st</sup> level, property *b* indexing
  * the 2<sup>nd</sup> and property *c* indexing the 3<sup>rd</sup>. If we then call
  * `map.put({a: "One", b: "Two", c: "Three}, "Test")`, the underlying object will be set to
  * the following: `{"One" -> {"Two" -> {"Three" -> "Test"}}}`.
  *
  * The advantages of this class over a conventional hashmap is that it covers a lot of 
  * use-cases with very little code. It is also quite fast with a constant number of operations 
  * for accessing the value of any key. Given the key structure, this class also supports selecting
  * all associations reachable by following a prefix of the key; this can be useful
  * in situations where the key is only partially available.
  *
  * @author Vikash Madhow <vikash.madhow@gmail.com>
  * @license MIT
  * @version 0.1.0
  */
'use strict';

(function(root, factory) {
  if (typeof exports === 'object' && typeof require === 'function') {
    // server-side, export through Node module.exports
    exports.Map = factory();
  } 
  else if (typeof define === "function" && define.amd) {
    // client-side with AMD available: register as an anonymous module.
    define(factory);
  } 
  else {
    // client-side without AMD. Register in a global namespace __vm__ as __vm__.util.Map
    root.__vm__ = root.__vm__ || {};
    root.__vm__.util = root.__vm__.util || {};
    root.__vm__.util.Map = factory();
  }
})(this, function() {
  /** @exports Map
    * @constructor
    * @memberof module:Map
    *
    * @classdesc Maps k1 -> k2 -> .... kn -> value where the k1 to kn are properties
    * of an object provided on construction and known as the key structure of the map.
    * For example, `Map.create({a: 'a', b: 'b', c: 'c'})` creates a map with the
    * structure a -> b -> c -> values. The order of sub-keys in the map follows the
    * order of enumeration of the key structure.
    *
    * Values can be inserted with the `put` method and retrieved with the `get` method.
    * Both methods require a key which can be supplied as an object or a string. As an object,
    * its properties must match those of the key structure of the map. A default value,
    * which can also be optionally supplied on construction or otherwise taken to be "`_`",
    * is assumed for any missing properties of the key. E.g. `map.get({a: "A", b: "B"})` in
    * the previous map will default the c property to "`_`".
    *
    * Keys can also be provided as a string in two forms: either "A/B/C" where the order of
    * each sub-key value must match the order of enumeration of the key structure of the map,
    * or "a:A/b:B/c:C" where any sub-key order may be used. Both type of keys can be mixed
    * with field names provided for only certain sub-keys, e.g., A/b:B/C; the sub-keys without
    * names will be matched to properties in the key structure of the map by position. A
    * forward-slash and a colon appearing in a sub-key can be escaped by preceding each with
    * a back-slash ('\/' & '\:', respectively).
    *
    * The map also has a `select` method which takes a prefix of the key structure and returns
    * the sub-map reachable by following that prefix. E.g., in the map above, `map.select("a:A")`
    * finds all mappings with a = A and returns the corresponding sub-map with the structure
    * `b -> c -> values`. This sub-map implements get, put and select and can be further manipulated.
    * Any changes to the sub-map will be reflected in the original map. When supplied with a full
    * key, select behaves exactly as get. Only consecutive sub-keys are followed; e.g., in
    * `map.select("a:A/c:C")`, the sub-key value c = C will not be followed as it does not follow
    * the sub-key `a`. For maps with very deep structure, select can be used to increase performance
    * when the prefix part of a key is fixed in a certain context (such as, e.g., inside a loop).
    *
    * @param {object} structure - The key structure of the map. This can be supplied either as an object, 
    *                             with each non-function property in enumeration order becoming a sub-key 
    *                             of the constructed map(e.g. {a: "a", b: "b"}), or an array of key-names (e.g. ["a", "b"]).
    * @param {*} [defaultSubKeyValue] - An optional default value to use for missing sub-keys
    *                                   in keys supplied to the get and put method. If not supplied,
    *                                   this defaults to "_".
    */
  var Map = function(structure, defaultSubKeyValue, parent) {

    defaultSubKeyValue = defaultSubKeyValue || "_";

    // The default key is initialized with the same fields as the key structure but
    // with all fields set to the default value. It is used to extend keys with the
    // default value inserted for all missing fields.
    var defaultKey = {};

    // Since the sub-keys in the map will be in the order of enumeration of the fields
    // of the structure, saving the fields in an array facilitates iteration during
    // map operations.
    var fields;
    if (Array.isArray(structure)) fields = structure;
    else {
      // Initialize the fields array and the defaultKey with all fields set to the defaultSubKeyValue.
      // This is used to extend keys supplied to map operation missing some of the fields in the
      // key structure of the map.
      var i = 0;
      fields = [];
      defaults(defaultKey, structure);
      for (var field in structure) {
        if (typeof structure[field] !== "function") {
          fields[i++] = field;
          defaultKey[field] = defaultSubKeyValue;
        }
      }
    }

    // The records of the map.
    var records = {};
    
    // The size of the map (the number of distinct key-value mappings)
    var size = 0;
    
    // The parent map of a sub-map or undefined if this map is at the top level.
    var parentMap = parent;
    
    /** A key is normally an object with each property being a sub-key. E.g.
      * `{a: "A", b: "B", c: "C"}`. The same key can be provided as a string as either
      * "A/B/C" where the order of each sub-key value is important or "a:A/b:B/c:C"
      * where any sub-key order may be used. Given a string key this method converts it
      * to an object key. When the string key does not contain the property names, the
      * latter are derived from the position of the sub-key in the key structure of the map.
      *
      * Both type of keys can be mixed with field names provided for only certain sub-keys,
      * e.g., A/b:B/C; the sub-keys without names will be matched to field by position.
      *
      * A forward-slash and a colon appearing in a sub-key can be escaped by preceding each
      * with a back-slash ('\/' & '\:', respectively).
      *
      * If the key is not a string, it is returned unchanged.
      *
      * @param {string|object} key - The key to convert to object form.
      * @returns {object} The key converted to object form if it was in string form.
      */
    this.toObjectKey = function(key) {
      if (typeof key === "string") {
        // hide escaped / and : in the unicode private space while processing
        key = key.replace(new RegExp("\\\\/", "g"), "\uE000")
                 .replace(new RegExp("\\\\:", "g"), "\uE001");

        // split along '/' and build object from each part
        var subKeys = key.split("/");
        var newKey = {};

        for (var i = 0; i < subKeys.length; i++) {
          var subKey = subKeys[i];
          var colon = subKey.indexOf(":");
          var field = colon === -1 ? fields[i] : subKey.substring(0, colon);
          var value = colon === -1 ? subKey    : subKey.substring(colon + 1);

          // unescape and set
          value = value.replace(new RegExp("\uE000", "g"), "/")
                       .replace(new RegExp("\uE001", "g"), ":");
          newKey[field] = value;
        }
        return newKey;
      }
      else return key;
    };    
    
    /** This is the reverse of {@link module:Map.Map#toObjectKey}: given a key in object form it 
      * returns an equivalent key in string form. If includePropertyNames is set to true
      * or not specified, the produced key will contain the property names for each sub-key.
      * 
      * @param {object} key - The key in object form. If not in object form, this key is
      *                       returned unchanged.
      * @param {boolean} [includePropertyNames] - Whether or not to include property names in
      *                                           in the produced key. Defaults to true.
      * @returns {string} A equivalent key in string form.
      * @see module:Map.Map#toObjectKey
      */      
    this.toStringKey = function(key, includePropertyNames) {
      
      function escape(key) { 
        return key.replace(new RegExp(":", "g"), "\\:")
                  .replace(new RegExp("/", "g"), "\\/"); 
      }
      
      if (typeof includePropertyNames === 'undefined') includePropertyNames = true;
      if (typeof key === 'object') {
        var newKey = '';
        for (var i = 0; i < fields.length; i++) {
          var subKey = key[fields[i]];
          if (typeof subKey !== 'undefined') {
            if (newKey.length > 0) newKey += '/';
            if (includePropertyNames) newKey += escape(fields[i]) + ':';
            newKey += escape(subKey);
          }
        }
        return newKey;
      }
      else return key;
    }

    /** This method takes a prefix of the key structure and returns the sub-map reachable by
      * following that prefix. E.g., in a map with key structure `{a, b, c}`, `map.select("a:A")`
      * finds all mappings with a = A and returns the corresponding sub-map with the structure
      * `b -> c -> values`. This sub-map implements get, put and select and can be further manipulated.
      * Any changes to the sub-map will be reflected in the original map. When supplied with a full
      * key, select behaves exactly as {@link module:Map.Map#get}.
      *
      * If the optional createSubMaps parameter is set to true (or not provided, in which case it
      * defaults to true), this method will automatically create submaps along the path of the
      * selected key if such did not exist previously. E.g. `map.select("A/B", false)` will return
      * `undefined` on an empty map. However, `map.select("A/B").put("C", "D")` is valid on the same
      * empty map as the select method would create the necessary submaps along the path `"A/B"`.
      *
      * Note that only consecutive sub-keys are followed; e.g., in `map.select("a:A/c:C")`, the
      * sub-key value c = C will not be followed as it does not follow the sub-key `a` in the key
      * structure.
      *
      * @param {string|object} key - The prefix (or full) key to select.
      * @param {boolean} [createSubMaps] - Whether to automatically along the path of a selected
      *                                    key. Defaults to true.
      * @returns {Map|*} Either the sub-map reachable by following the prefix key supplied or,
      *          if a full key is supplied, the value associated to it (or undefined
      *          if no such association exists).
      */
    this.select = function(key, createSubMaps) {
      if (typeof createSubMaps === 'undefined') createSubMaps = true;
      
      key = this.toObjectKey(key);
      var subKey = key[fields[0]];
      if (typeof subKey !== 'undefined') {   
        var value = records[subKey];
        if (fields.length === 1) return value;
        else {
          if (typeof value === 'undefined') {
            if (createSubMaps) {
              records[subKey] = new Map(fields.slice(1), defaultSubKeyValue, this);
              return records[subKey].select(key);
            }
            else return undefined;
          }
          else return value.select(key);     
        }
      }
      else return this;
    };
    
    /** Returns the value previously associated to the key, if any. Otherwise,
      * if defaultValue is supplied and it is not a function, return it. If 
      * defaultValue is a function, execute it with this map as context and return
      * its return value. 
      * 
      * Missing sub-keys  in the key are assumed to be equal to the defaultSubKeyValue 
      * supplied on construction ("_" by default).
      *
      * @param {object|string} key - The key whose associated value is sought.
      * @param {*} [defaultValue] - An optional value to return if no value was
      *                             previously associated with the key. If this is a
      *                             function, it is executed and its return value is returned.
      * @returns {*} The value associated to the key or, if none, the supplied defaultValue or its 
      *              return value (if it is a function) or, barring all this, undefined.
      */
    this.get = function(key, defaultValue) { 
      var value = this.select(defaults(key, defaultKey), false);
      if (typeof value !== 'undefined')             return value;
      else if (typeof defaultValue === 'function')  return defaultValue.call(this);
      else                                          return defaultValue;
    }
    
    /** Returns the value previously associated to the key, if any, or otherwise,
      * associate the key to the defaultValue, if supplied. If defaultValue is a
      * function, execute it and associate the key to its return value instead. This
      * method is useful when the map is used as a cache, returning the values of previously 
      * associated keys if existing or, when not, computing the value and saving it for
      * subsequent access.
      * 
      * Missing sub-keys  in the key are assumed to be equal to the defaultSubKeyValue 
      * supplied on construction ("_" by default).
      *
      * @param {object|string} key - The key whose associated value is sought.
      * @param {*} value - The value to associate to the key if no value was previously 
      *                    associated to it. If this is a function, it is executed and its 
      *                    return value is associated to the key.
      * @returns {*} The value associated to the key or, if none, the supplied value or its 
      *              return value (if it is a function) or, barring all this, undefined.
      */
    this.getOrElseUpdate = function(key, value) {
      var existing = this.select(defaults(key, defaultKey), false);
      if (typeof existing === 'undefined') {
        existing = typeof value === 'function' ? value.call(this) : value;
        if (typeof existing !== 'undefined') this.put(key, existing);
      }
      return existing;
    };
    
    /** Check if this map contains the specified key.
      * 
      * @param {object|string} key - The key to check.
      * @returns {boolean} True if the map contains the key, false otherwise.
      */
    this.contains = function(key) { return typeof this.get(key) !== 'undefined'; };

    /** Associate a value to a key, replacing the existing association, if any. Missing 
      * sub-keys are assumed to be equal to the defaultSubKeyValue supplied on construction 
      * ("_" by default)".
      *
      * @param {object|string} key - The key to associate the value to.
      * @param {*} value - The value to associate to the key.
      * @returns {*} The previous value associated to the key or undefined if none.
      */
    this.put = function(key, value) {
      key = this.toObjectKey(key);
      var subKey = key[fields[0]];
      subKey = typeof subKey !== 'undefined' ? subKey : defaultSubKeyValue;
      var oldValue;
      if (fields.length === 1) {
        oldValue = records[subKey];
        records[subKey] = value;
        if (typeof oldValue === 'undefined') this.__incrementSize();
      }
      else {
        var next = records[subKey];
        if (!next) {
          records[subKey] = next = new Map(fields.slice(1), defaultSubKeyValue, this);
        }
        oldValue = next.put(key, value);
      }
      return oldValue;
    };
    
    /** @returns {number} The size (number of key-value pairs) in this map. */
    this.size = function() { return size; };
    
    /** Removes the key and its associated value from the map. Removing a key from a sub-map 
      * obtained by selecting on a parent map will also remove the corresponding key-value pair
      * from the parent map.
      *
      * @param {string|object} key The key to remove from the map. 
      * @return {*} The value previously associated to the key or undefined if none. 
      */
    this.remove = function(key) {
      if (records) {
        key = this.toObjectKey(key);
        
        var subKey = key[fields[0]];
        subKey = typeof subKey !== 'undefined' ? subKey : defaultSubKeyValue;
        var oldValue;
        if (fields.length === 1) {
          oldValue = records[subKey];
          delete records[subKey];
          if (typeof oldValue !== 'undefined') this.__decrementSize();
        }
        else {
          var next = records[subKey];
          if (next) oldValue = next.remove(key);
        }
        return oldValue;
      }
      else return undefined;
    };
    
    /** Clears the map of all key-value associations. Clearing a sub-map obtained by
      * selecting on a parent map will also clear all corresponding key-value pairs from 
      * the parent map.
      *
      * **Alias: removeAll**
      */
    this.clear = this.removeAll = function() { 
      if (records) {        
        for (var prop in records) {
          if (fields.length === 1) {
            delete records[prop];
            this.__decrementSize();
          }
          else records[prop].clear();
        }
      }
    }

    /** A callback invoked during iteration with {@link module:Map.Map#each}.
      *
      * @callback Iterator
      * @param {object} key - The key of the mapping being iterated upon.
      * @param {*} value - The value of the mapping being iterated upon.
      * @param {Map} map - The map being iterated upon.
      */
    
    /** Iterates over all key-value mappings in the map and invokes the iterator callback
      * with each key, value and the current map. The value of `this` in the iterator
      * function is set to the context, if provided; otherwise it is set to the current
      * map. 
      *
      * @param {Iterator} iterator - The iterator function to invoke for each mapping.
      * @param {*} [context] - The optional value of `this` in the iterator function;
      *                        defaults to the current map.
      */
    this.each = function(iterator, context) { 
      this.__each({}, iterator, context || this, this); 
    }
    
    // INTERNAL iteration method
    this.__each = function(key, iterator, context, map) {
      if (records) {
        for (var prop in records) {
          key[fields[0]] = prop;
          if (fields.length === 1) iterator.call(context, defaults({}, key), records[prop], map);
          else                     records[prop].__each(key, iterator, context, map);
        }
      }
    };
    
    // Used internally to increase size variable and propagate size changes to parent maps 
    // when items are added directly to a sub-map obtained from a select on a parent map. 
    // INTERNAL USE ONLY.
    this.__incrementSize = function() {
      size++;
      if (parentMap) parentMap.__incrementSize();
    };
    
    // Used internally to decrease size variable and propagate size changes to parent maps 
    // when items are removed directly from a sub-map obtained from a select on a parent map. 
    // INTERNAL USE ONLY.
    this.__decrementSize = function() {
      size--; 
      if (parentMap) parentMap.__decrementSize();
    };
  }

  /** Factory method which creates a map by invoking the constructor
    * with the specified structure and optional default sub-key value.
    *
    * @param {object} structure -  The key structure of the map. This can be supplied either as an object, 
    *                             with each non-function property in enumeration order becoming a sub-key 
    *                             of the constructed map(e.g. {a: "a", b: "b"}), or an array of key-names (e.g. ["a", "b"]).
    * @param {*} [defaultSubKeyValue] - An optional default value to use for missing sub-keys
    *                                   in keys supplied to the get and put method. If not supplied,
    *                                   this defaults to "_".
    * @returns {Map} The constructed map.
    */
  Map.create = function(structure, defaultSubKeyValue) {
    return new Map(structure, defaultSubKeyValue);
  }
  
  // Extends object with default properties from def
  function defaults(object, def) {
    for (var prop in def) {
      if (def.hasOwnProperty(prop) && !object.hasOwnProperty(prop)) {
        object[prop] = def[prop];
      }
    }
    return object;
  }

  return Map;
});