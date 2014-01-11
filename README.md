# About

A simple map implemention in Javascript mapping a set of keys to values and which does not need a hash function.

## Motivation

It is easy to create a map of key-value pairs in Javascript using the object literal notation. Things become a little more complicated when you need to map a set of keys to values. Say, for example, you are building a client-side templating library with templates being selectable by theme, name and user action. You might structure you template list as follows:

| Theme   | Name          | Action    | Template                        |
| ------- | ------------- | --------- | ------------------------------- |
| Default | Customer      | Add       | `<form><div>.... </div></form>` |
| Default | Customer      | Edit      | `<form><div>.... </div></form>` |
| Blue    | Customer      | Add       | `<form><div>.... </div></form>` |
| Blue    | Customer      | Edit      | `<form><div>.... </div></form>` |

A template will then be selected by providing the theme, name and action. If Javascript supported object keys, this would be easy: simply create an object with those 3 key properties (theme, name and action) and map that to the template as follows:

```javascript
// Wrong: won't work as expected
var templates = {};
templates[{theme: 'Default', name: 'Customer', action: 'Add'}] = '<form><div>...</div></form>';
templates[{theme: 'Default', name: 'Customer', action: 'Edit'}] = '<form><div>...</div></form>';
```

The previous code will not work since Javascript only supports strings as properties with non-strings being converted to strings before being used as a property. Executing the above code will produce a `templates` object with a single property named `[object Object]` mapped to the last template. This is because the default `toString()` method in `Object.prototype` returns `[object Object]`.

We could build a Hashtable data structure in Javascript but this will require a hash function for all objects that could be used as keys. Should the hash values not be normally distributed, the performance of the hashtable would suffer. 

To make things a little more interesting in the above templates example, we might we need to load all templates for a specific theme, or with a specific theme and name but for any action. This cannot be achieved with a hashtable data structure as values can only be retrieved with a complete key, not a partial one.

## A simple solution

A simple solution to the above templating problem would be to nest objects with the top level object representing the first key level (theme), the 2nd level objects for the 2nd level key (name), and so on, as follows:

```javascript
var templates = {
  "Default": {
    "Customer": {
      "Add": "<form><div>.... </div></form>",
      "Edit": "<form><div>.... </div></form>"
    }
  },
  
  "Blue": {
    "Customer": {
      "Add": "<form><div>.... </div></form>",
      "Edit": "<form><div>.... </div></form>"
    }
  }
};
```

We could then easily access any template by selecting the relevant object at each level as follows:

```javascript
templates["Blue"]["Customer"]["Add"]
```

Further we could select all templates in a specific theme or theme and nam, as follows:

```javascript
// select all templates in Blue
var blue = templates["Blue"];

//...
// later, when we have more information we can select the specific blue template needed
var template = blue["Customer"]["Edit"];
```

This data storage and access pattern can be useful in a variety of situations where a list of data items needs to be stored and made accessible through a partial or complete set of key values. This pattern is captured and enhanced in the Map class of this project.

## Usage

The map.js class exports the Map constructor. On the server-side, with Node.js, this exported through `module.exports` and accessible with the `require` function. On the client-side, if RequireJs is being used, the constructor is registered as an anonymous module. If RequireJs is not present, the constructor simply exported to `__vm__.util.Map`. The following examples assume that the constructor is made available as a variable Map. This can be set up as follows:

```javascript
// with RequireJs
define('app/js/map', function(Map) {
  // your code here
  //...
});

// without RequireJs
var Map = __vm__.util.Map;
```

### Creating a map
