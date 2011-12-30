Kaete
=====

**K**aete's **A**n **E**CMAScript **T**emplating **E**ngine.

*Kaete is in active development and is very turbulent right now. The API and
template language may change as features and implementation are not yet
finalized. Expect bugs!*


Introduction
------------

Kaete is fast and lightweight JavaScript templating engine loosely
based on John Resig's [Micro-Templating blog post](http://ejohn.org/blog/javascript-micro-templating/).


### Demo Console

You can test out the development version of Kaete in this nifty
[demo console](http://dtcooper.github.com/Kaete/).


Template API
------------

Here's a sample use of the API.

    var context = {
        thing: "World"
    }

    var template_code = '[% for (var i = 0; i < 5; i++) { %]\n'
        + '<p>Hello, [[ thing ]]!</p>\n'
        + '[% } %]';
        
    var template = new Kaete(template_code);

    var rendered_template = template.render(context);

    // Use jQuery to write results (jQuery not required for Kaete)
    $("#template_div").html(rendered_template);
    

This will set the contents of `<div id="template_div"></div>` to,

    <p>Hello, World!</p>
    <p>Hello, World!</p>
    <p>Hello, World!</p>
    <p>Hello, World!</p>
    <p>Hello, World!</p>


Template Tags
-------------

### Code Template Tag

A code template tag looks like this,

    [% [... JavaScript goes here ...] %]

These can be used for JavaScript in your template. An example below renders
"Hello" five times,

    [% for (var i = 0; i < 5; i++) { %]

        Hello

    [% } %]


This would output the following *with whitespace changed for clarity,*

    Hello
    Hello
    Hello
    Hello
    Hello


### Variable Template Tag

A variable template tag looks like this,

    [[ [... JavaScript expression to be outputted goes here ...] ]]

They include any valid JavaScript expression, typically variable names
to be evaluated and outputted. In general, they **should not contain
semi-colons.**

Assuming the context variables `name` and `age` are defined, here's
a simple example.

    <h1>Employee Profile</h1>
    
    Name: [[ name ]]
    Age: [[ age ]]


This would render as follows,

    <h1>Employee Profile</h1>
    
    Name: John Doe
    Age: 47


#### HTML Entity Auto-escaping

By default, the contents of a variable template tag have any HTML
special characters auto-escaped to their entities.

For example,

    [% var greeting = '<h1>Hello!</h1>'; %]
        
    [[ greeting ]]

Renders to,

    &lt;h1&gt;Hello!&lt;/h1&gt;


##### Disabling Auto-escape

If you would like to disable HTML auto-escaping, you must use the following
template tag,

    [[* [... un-escaped JavaScript expression goes here ...] ]]

Similar to the above,

For example,

    [% var greeting = '<h1>Hello!</h1>'; %]
        
    [[* greeting ]]

Renders to,

    <h1>Hello!</h1>


#### The `print(string, unescaped)` function

For advanced output, a convenience function `print(string, unescaped)`
is available for use in your code tags.

This allows for text to be rendered in the template in a code tag, without
using a variable tag.

For example,

    [%
   
    var people = ['Bob', 'Susan', 'Bill', 'Mohammed'];
   
    for (var i in people) {
        print(people[i]);
        print("\n");
    }
    
    %]

Renders to,

    Bob
    Susan
    Bill
    Mohammed
    

### Comment Tag

A comment looks like this,

    [# [... Comment goes here ...] #]

For example,

    [# This is a really great comment! #]


License
-------

    Copyright (c) 2011, David Cooper <dave@kupesoft.com>
    All rights reserved.

    Dedicated to Kate Lacey

    Permission to use, copy, modify, and/or distribute this software
    for any purpose with or without fee is hereby granted, provided
    that the above copyright notice, the above dedication, and this
    permission notice appear in all copies.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
    WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
    WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL
    THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
    CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
    NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
    CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

