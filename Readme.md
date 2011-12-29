Kaete
=====

Kaete's An ECMAScript Templating Engine.

Introduction
------------

Kaete is fast and lightweight JavaScript templating engine loosely
based on [John Resig's Micro-Templating blog post](http://ejohn.org/blog/javascript-micro-templating/).
It aims to be a more 


### Test Console

Try out the [test console](http://dtcooper.github.com/Kaete/).


Template Tags
-------------

### Code Template Tag

    <% [... JavaScript goes here ...] %>

These can be used for JavaScript in your template. An example below renders
"Hello" five times,

    <% for (var i = 0; i < 5; i++) { %>
    
        Hello
    
    <% } %>


This would output the following *with whitespace changed for clarity,*

    Hello
    Hello
    Hello
    Hello
    Hello


#### Semi-colon Warning

#### The `print(string, unescaped)` function


### Variable Template Tag

    << [... JavaScript expression to be outputted goes here ...] >>


#### Auto-escaping

##### Disabling Auto-escape

    <<! [... un-escaped JavaScript expression goes here ...] >>


### Comment Tag

    <# [... Comment goes here ...] #>


Template API
------------

### The `Keate` object

#### Creating a Template

#### Rendering Templates


jQuery Plug-in
--------------

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

