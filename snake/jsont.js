/*	This work is licensed under Creative Commons GNU LGPL License.

	License: http://creativecommons.org/licenses/LGPL/2.1/
   Version: 0.9
	Author:  Stefan Goessner/2006
	Web:     http://goessner.net/ 
	
	jsonT is XSLT realization
	see https://ru.wikipedia.org/wiki/XSLT
	
============================
 Transforming JSON
============================
JSON is a lightweight text format for data interchange. It is often better suited for structured data than XML.

A frequently requested task with JSON data is its transformation to other formats, especially to XML or HTML for further processing.

The most obvious way to achive this, is to use a programming language (ECMAscript, Ruby,…) and the DOM-API.

In XML we can transform documents by another XML document containing transformation rules (XSLT) and applying these rules using an XSLT-processor.

Adopting that concept I have been experimenting with a set of transformation rules (written in JSON).

As a result in analogy to XML/XSLT the combination JSON/JSONT can be used to transform JSON data into any other format by applying a specific set of rules.	

============================
 Introducing JSONT
============================
Let's start with a simple JSON object

{ "link": {"uri":"http://company.com", "title":"company homepage" }}

which we want to transform into a HTML link element.

<a href="http://company.com">company homepage</a>

For doing this we can write a corresponding rule

{ "link": "<a href=\"{link.uri}\">{link.title}</a>" }

and using a processor like jsonT(data, rules) we can apply the given rule to the JSON data resulting in the output string above.

============================
 Basic Rules
============================
A set of transformation rules is written using the object literal notation. So each rule is a name/value pair. The rule name usually is an expression for accessing an object member. The rule value is either a string or a function with a single argument, which are evaluated at transformation time.

"name": "transformation string"
"name": function(arg){ ... }

The transformation string itself can contain one or more expressions enclosed in curly braces

{expr}

which always resolve to a string value.

    If expr references a rule name, it results in either the transformation string or the return value of the implicit transformation function of that rule.
    If expr evaluates to a primitive data type, its value is converted to a string.
    If expr evaluates to an array/object, each array element/object member is processed accordingly.
    The shortcut $ as part of the expr is substituted by the rule name.
    If expr has the explicit form @name(expr), the function belonging to the rule name is called and its return value is converted to a string.

The outer JSON object can be accessed using the keyword self.

Rule names for array elements use the syntax name[*]. When using the $ shortcut in transformation string, the '*' resolves to the actual array index.

Object members, which have no transformation rule assigned and are not directly or indirectly referenced, as well as expressions evaluating to undefined don't create output. 

============================
Some examples
============================
vector geometry

{ "line": { "p1": {"x":2, "y":3},
            "p2": {"x":4, "y":5} }}

+

{ "self": "<svg>{line}</svg>",
  "line": "<line x1=\"{$.p1.x}\" y1=\"{$.p1.y}\"" +
                "x2=\"{$.p2.x}\" y2=\"{$.p2.y}\" />" }

=

<svg><line x1="2" y1="3"x2="4" y2="5" /></svg>

simple array

["red", "green", "blue"]

+

["self": "<ul>\n{$}</ul>",
 "self[*]": "  <li>{$}</li>\n"]

=

<ul>
  <li>red</li>
  <li>green</li>
  <li>blue</li>
</ul>

two-dimensional array and implicit function rule

{ "color": "blue",
  "closed": true,
  "points": [[10,10],[20,10],[20,20],[10,20]] }

+

{ "self": "<svg><{closed} stroke=\"{color}\" points=\"{points}\" />"+
          "</svg>",
  "closed": function(x){return x ? "polygon" : "polyline";}, 
  "points[*][*]": "{$} " }

=

<svg><polygon stroke="blue" points="10 10 20 10 20 20 10 20 " /></svg>
	
*/

function jsonT(self, rules) {
   var T = {
      output: false,
      init: function() {
         for (var rule in rules)
            if (rule.substr(0,4) != "self")
               rules["self."+rule] = rules[rule];
         return this;
      },
      apply: function(expr) {
         var trf = function(s){ return s.replace(/{([A-Za-z0-9_\$\.\[\]\'@\(\)]+)}/g, 
                                  function($0,$1){return T.processArg($1, expr);})},
             x = expr.replace(/\[[0-9]+\]/g, "[*]"), res;
         if (x in rules) {
            if (typeof(rules[x]) == "string")
               res = trf(rules[x]);
            else if (typeof(rules[x]) == "function")
               res = trf(rules[x](eval(expr)).toString());
         }
         else 
            res = T.eval(expr);
         return res;
      },
      processArg: function(arg, parentExpr) {
         var expand = function(a,e){return (e=a.replace(/^\$/,e)).substr(0,4)!="self" ? ("self."+e) : e; },
             res = "";
         T.output = true;
         if (arg.charAt(0) == "@")
            res = eval(arg.replace(/@([A-za-z0-9_]+)\(([A-Za-z0-9_\$\.\[\]\']+)\)/, 
                                   function($0,$1,$2){return "rules['self."+$1+"']("+expand($2,parentExpr)+")";}));
         else if (arg != "$")
            res = T.apply(expand(arg, parentExpr));
         else
            res = T.eval(parentExpr);
         T.output = false;
         return res;
      },
      eval: function(expr) {
         var v = eval(expr), res = "";
         if (typeof(v) != "undefined") {
            if (v instanceof Array) {
               for (var i=0; i<v.length; i++)
                  if (typeof(v[i]) != "undefined")
                     res += T.apply(expr+"["+i+"]");
            }
            else if (typeof(v) == "object") {
               for (var m in v)
                  if (typeof(v[m]) != "undefined")
                     res += T.apply(expr+"."+m);
            }
            else if (T.output)
               res += v;
         }
         return res;
      }
   };
   return T.init().apply("self");
}

/*
////////////////////////////////
// SAMPLE SECTION
////////////////////////////////

<html>
<head>
<title> JSONT - Tests </title>
<script type="text/javascript" src="jsont.js"></script>
<script type="text/javascript">

var o = [], t = [];

t[1] = { "self": "<table>{pnt}</table>",
         "pnt": "<tr><td>{pnt.x}</td><td>{pnt.y}</td></tr>" };
o[1] = { pnt: { x:2, y:3 }};

t[2] = { "self": "<table><tr>{$}</tr></table>",
         "self[*]": "<td>{$}</td>" };
o[2] = [ 1, 2 ];

t[3] = { "self": "<table>\n{$}\n</table>",
          "self[*]": "<tr>{$}</tr>\n",
          "self[*][*]": "<td>{$}</td>" };
o[3] = [[1,2],[3,4]];

t[4] = { "self": "<div>\n{p}\n</div>",
          "p": "<table><tr>{$}</tr></table>\n",
          "p[*]": "<td>{$.x}</td><td>{$.y}</td>" };
o[4] = {a:"hello", p:[{x:1,y:2},{x:3,y:4}]};

t[5] = { "self": "<a href=\"{uri}\" title='{title}'>{$.title}</a>" };
o[5] = { uri:"http://somewhere.org", title:"somewhere homepage" };

t[6] = { "menu": "<menu>\n  <header>{menu.header}</header>\n{menu.items}</menu>",
         "menu.items[*]": function(x){
                            return x ? "  <item action=\""+x.id+"\" id=\""+x.id+"\">"+(x.label||x.id)+"</li>\n" 
                                     : "  <separator/>\n";} };
o[6] = {"menu": {
          "header": "SVG Viewer",
          "items": [
            {"id": "Open"},
            {"id": "OpenNew", "label": "Open New"},
            null,
            {"id": "ZoomIn", "label": "Zoom In"},
            {"id": "ZoomOut", "label": "Zoom Out"},
            {"id": "OriginalView", "label": "Original View"},
            null,
            {"id": "Quality"},
            {"id": "Pause"},
            {"id": "Mute"},
            null,
            {"id": "Find", "label": "Find..."},
            {"id": "FindAgain", "label": "Find Again"},
            {"id": "Copy"},
            {"id": "CopyAgain", "label": "Copy Again"},
            {"id": "CopySVG", "label": "Copy SVG"},
            {"id": "ViewSVG", "label": "View SVG"},
            {"id": "ViewSource", "label": "View Source"},
            {"id": "SaveAs", "label": "Save As"},
            null,
            {"id": "Help"},
            {"id": "About", "label": "About Adobe CVG Viewer..."}
    ]}};

t[7] = { "self": "<p> {a} {b} {c} {d} </p>" };
o[7] = { a:false, b:null, d:true };

t[8] = { "self": "<p> {a} </p>",
         "a": function(x) {return x ? 'black' : 'white';} };
o[8] = { "a": true };

t[9] = { "A": "<div>{A.a1} and {A.a2}</div>" };
o[9] = { "A" : { "a1": "a1val", "a2": "a2val" },
         "B" : { "b1": "b1val", "b2": "b2val" } };

o[10] = { "line": { "p1": {"x":2, "y":3},
                    "p2": {"x":4, "y":5} }};
t[10] = { "self": "<svg>{line}</svg>",
             "line": "<line x1=\"{$.p1.x}\" y1=\"{$.p1.y}\"" +
                           "x2=\"{$.p2.x}\" y2=\"{$.p2.y}\" />" };

o[11] = ["red", "green", "blue"];
t[11] = {"self": "<ul>\n{$}</ul>\n",
            "self[*]": "  <li>{$}</li>\n"};
o[12] = { "color": "blue",
          "closed": true,
          "points": [[10,10],[20,10],[20,20],[10,20]] };
t[12] = { "self": "<svg><{closed} stroke=\"{color}\" points=\"{points}\" /></svg>",
          "closed": function(x){return x ? "polygon" : "polyline";}, 
          "points[*][*]": "{$} " };

o[13] = {"menu": {
  "id": "file",
  "value": "File:",
  "popup": {
    "menuitem": [
      {"value": "New", "onclick": "CreateNewDoc()"},
      {"value": "Open", "onclick": "OpenDoc()"},
      {"value": "Close", "onclick": "CloseDoc()"}
    ]
  }
}};

t[13] = { "menu": "<menu id=\"{$.id}\" value=\"{$.value}\">\n"+
                  "  <popup>\n{$.popup.menuitem}  </popup>\n</menu>",
          "menu.popup.menuitem[*]": "    <menuitem value=\"{$.value}\""+
                                    "onclick=\"{$.onclick}\" />\n" };

o[14] = [{"u":"http://www.ericclapton.com/hello",
            "d":"Eric Clapton",
            "t":["guitarist","blues","rock"]},
           {"u":"http://www.bbking.com/",
            "d":"B.B. King : Official Site",
            "t":["guitarist","blues"]},
           {"u":"http://www.stevieraysbluesbar.com/",
            "d":"Louisville's House of Blues",
            "t":["guitarist","blues","rock"]}];

t[14] = { "self": "<ul>\n{$}</ul>",
          "self[*]": " <li>\n"+
                     "  <img style='position:absolute;display:none;'"+
                     "    width='16' height='16'\n"+
                     "    onload='showImage(this)' src='{@icon($.u)}'/>\n"+
                     "  <a style='margin-left:20px;' href='{$.u}'>{$.d}</a>\n"+
                     " </li>\n",
          "icon": function(x){return x.split('/').splice(0,3).join('/')+'/favicon.ico';}           
           };

t[15] = { "self": "<p> {$.a} </p>",
          "a": function(x){return x ? 'black' : 'white'} }
o[15] = { "a": true };

t[16] = { "self": "<p> {a}, {b}, {b.x} </p>",
          "b": "hello",
          "b.x": "" };
o[16] = { "a": false, "b": null };

t[17] = { "self": function(x){ return x.length; } }
o[17] = [ 1, 2, 1 ];

function test()
{
	var N1 = 1; // 1
	var N2 = 17; // 17
	
	for(i=N1; i<N2+1; i++ )
	{
   		show(jsonT(o[i], t[i]));
   	}
}

function show(s) { document.getElementById("out").innerHTML += (s+"\n").replace(/&/g, "&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g, "<br/>") + "<hr/>"; }
window.onload = test;
</script>
</head>

<body>
<pre id="out"></pre>
</body>
</html> 

*/