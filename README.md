About
=====
A multi-key map implementation in Javascript which does not need a hash function.

Motivation
----------
It is easy to create a map of key-value pairs in Javascript using the object literal notation. Things become a little more complicated when you need to map a set of keys to values. Say, for example, you are building a client-side templating library with templates being selectable by theme, name and user action. You might structure your template list as follows:

| Theme   | Name          | Action    | Template                      |
| ------- | ------------- | --------- | ----------------------------- |
| Default | Customer      | Add       | `<form><div>...</div></form>` |
| Default | Customer      | Edit      | `<form><div>...</div></form>` |
| Blue    | Customer      | Add       | `<form><div>...</div></form>` |
| Blue    | Customer      | Edit      | `<form><div>...</div></form>` |

A template will then be selected by providing the theme, name and action. If Javascript supported object keys, this would be easy: simply create an object with those 3 key properties (theme, name and action) and map that to the template as follows:

```javascript
// Wrong: doesn't work as expected
var templates = {};
templates[{theme: 'Default', name: 'Customer', action: 'Add'}] = '<form><div>...</div></form>';
templates[{theme: 'Default', name: 'Customer', action: 'Edit'}] = '<form><div>...</div></form>';
```

The previous code will not work since Javascript only supports strings as properties with non-strings being converted to strings before being used as a property. Executing the above code will produce a `templates` object with a single property named `[object Object]` mapped to the last template. This is because the default `toString()` method in `Object.prototype` returns `[object Object]`.

We could build a Hashmap data structure in Javascript but that would require a hash function for all objects that could be used as keys. Should the hash values not be well distributed, the performance of the hashmap would suffer. 

To make things a little more interesting in the above templates example, we might need to load all templates for a specific theme, or with a specific theme and name but for any action. This cannot be achieved with a hashmap as values can only be retrieved with a complete key and not a partial one.

A simple solution
-----------------

A simple solution to the above templating problem would be to nest objects with the top level object representing the first key level (theme), the 2nd level objects for the 2nd level key (name), and so on, as follows:

```javascript
var templates = {
  "Default": {
    "Customer": {
      "Add": "<form><div>...</div></form>",
      "Edit": "<form><div>...</div></form>"
    }
  },
  
  "Blue": {
    "Customer": {
      "Add": "<form><div>...</div></form>",
      "Edit": "<form><div>...</div></form>"
    }
  }
};
```

We could then easily access any template by selecting the relevant object at each level as follows:

```javascript
templates["Blue"]["Customer"]["Add"]
```

Further we could select all templates in a specific theme or theme and name, as follows:

```javascript
// select all templates in Blue
var blue = templates["Blue"];

//...
// later, when we have more information we can select the specific blue template needed
var template = blue["Customer"]["Edit"];
```

This data storage and access pattern can be useful in a variety of situations where a list of data items needs to be stored and made accessible through a partial or complete set of key values. It is however not obvious how to iterate on the items. Further, the number of items stored can only be determined by visiting all 3 levels and counting the number of mappings at the lowest level.

A sensible iteration strategy would be to treat that structure as a tree (which it is!) and iterate in a depth-first manner as follows:

```javascript
// assuming templates variable above and an iterator function, iterate
for (var theme in templates)
  for (var name in templates[theme])
    for (var action in templates[theme][name])
       iterate({theme: theme, name: name, action: action}, templates[theme][name][action]);
```

The size problem can be resolved by keeping a `size` property at each level in the structure which is modified when items are added to or removed from the structure. That property should be kept at each level since a sub-level map could be accessed through a partial key (e.g. `templates['Blue']`) and it is reasonable to assume that knowing the size of that sub-level map could be useful. The `size` property must also be kept in sync at all levels to ensure that a change at a lower level in the data structure is properly reflected at all levels above.

A generic version of this pattern which can work with any set of keys together with enhancements necessary for, among others, seamless iteration and size synchronisation, is implemented in the Map class of this project.

Getting started
---------------

The map.js file exports the Map constructor. On the server-side, with Node.js, this is exported through `module.exports` and accessible with the `require` function. On the client-side, if *RequireJs* is being used, the constructor is registered as an anonymous module. If RequireJs is not present, the constructor is simply exported in a global variable `__vm__` as `__vm__.util.Map`. The following examples assume that the constructor is made available as a variable named `Map`. This can be set up as follows:

```javascript
// with RequireJs
define(['app/js/map'], function(Map) {
  // your code here
  //...
});

// without RequireJs
var Map = __vm__.util.Map;
// your code here
//...
```

### Creating a map

A map is created by invoking the constructor or by invoking the `Map.create` factory method with a key structure:

```javascript
// Invoking constructor with an object literal describing the key structure.
// The order of the properties is important but the value associated to the
// property names aren't. The values are provided only because Javascript
// requires a property value for all properties in an object literal.
var templates = new Map({theme: "Theme", name: "Name", action: "Action"});

// Creation through the Map.create factory method with an array of keys
var friends = Map.create(["firstName", "lastName"]);
```

### Putting and retrieving items in the map

Use the put and get methods for these operations. Keys can be specified in object and string form:

```javascript
templates.put({theme: "Blue", name: "Customer", action: "Add"}, "<form><div>...</div></form>");

// keys can also be specified in string form in long and short forms
// In short forms the key names are not specified, they are determined
// by position:
templates.put("theme:Blue/name:Customer/action:Edit", "<form><div>...</div></form>");
templates.put("Default/Customer/Add", "<form><div>...</div></form>");

var template = templates.get("Default/Customer/Add");
```

### Selecting a partial map

A sub-level map can be selected by supplying a prefix of a key to the `select` method. Any modifications to the sub-level map will be reflected at higher levels. E.g.:

```javascript
// get blue customer templates and add a new template into it
// The size of this sub-level as well as the templates map will
// increase by 1

var templatesSize = templates.size();
var blueCustomer = templates.select('Blue/Customer');
var blueCustomerSize = blueCustomer.size();

// When putting and retrieving in a sub-level map, higher-level
// keys are not needed
var add = blueCustomer.get("Add");
blueCustomer.put("Delete", "<a href='...'>...</a>");

console.assert(templates.size() === templatesSize + 1);
console.assert(blueCustomerSize.size() === blueCustomerSize + 1);
```

### Iteration

The `each` method can be invoked on a map to iterate on all keys and values:

```javascript
templates.each(function(key, value, map) {
  console.log(key);
  console.log(value);
});
```

Testing
--------

Unit testing with Jasmine is included in the test folder. Simply open the SpecRunner.html or SpecRunnerWithAMD.html in a browser to execute the tests. The map specification is in the `test/spec/mapSpec.js` file  

Docs
--------

Extensive documentation is included in the source code of `map.js` in JSDoc format. The JSDocs are also in the `docs` folder.

Contact
-------

Contact me on `vikash.madhow@gmail.com` if you have any queries.
