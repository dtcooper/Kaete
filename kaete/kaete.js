(function() {
    var global = this;

    var cache = {};

    var Kaete = global.Kaete = function(template) {
        this.template = template;

        if (typeof cache[template] === "undefined") {
            this.compile();
            cache[template] = {func: this.func, func_body: this.func_body};
        } else {
            this.func = cache[template].func;
            this.func_body = cache[template].func_body;
        }
    }

    // The beginning special char, eg the "[" in "[% ... %]"
    Kaete.TAG_START = '[';

    // The ending special char, eg the "]" in "[% ... %]"
    Kaete.TAG_END = ']';

    // The beginning code tag type char, eg the left "%" in "[% ... %]"
    Kaete.TAG_CODE_START = '%';

    // The ending code tag type char, eg the right "%" in "[% ... %]"
    Kaete.TAG_CODE_END = '%';

    // The beginning comment tag type char, eg the left "#" in "[# ... #]"
    Kaete.TAG_COMMENT_START = '#';

    // The ending comment tag type char, eg the right "#" in "[# ... #]"
    Kaete.TAG_COMMENT_END = '#';

    // The beginning variable tag type char, eg the inner left "[" in "[[ ... ]]"
    Kaete.TAG_VARIABLE_START = '[';

    // The ending variable tag type char, eg the inner right "]" in "[[ ... ]]"
    Kaete.TAG_VARIABLE_END = ']';

    // The unescaped variable signifier, eg the "*" in "[[* ... ]]"
    Kaete.TAG_VARIABLE_UNESCAPED = '*';


    var parser;

    var generate_parser = function() {
        var escape_regexp = function(s) {
            return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }

        parser = new RegExp(
            // Start of tag, start of non-capturing group for tag types.
            escape_regexp(Kaete.TAG_START) + '(?:'

            // Match a code tag, group 1 as matched code, end of code tag;
            + escape_regexp(Kaete.TAG_CODE_START) + '([\\s\\S]+?)' + escape_regexp(Kaete.TAG_CODE_END)

            // or match a variable tag, group 2 as the optional unescape char,
            + '|' + escape_regexp(Kaete.TAG_VARIABLE_START) + '(' + escape_regexp(Kaete.TAG_VARIABLE_UNESCAPED) + '?)'

            // group 3 as matched expression, end of variable tag;
            + '([\\s\\S]+?)' + escape_regexp(Kaete.TAG_VARIABLE_END)

            // or match a complete comment tag, no need to group
            + '|' + escape_regexp(Kaete.TAG_COMMENT_START) + '[\\s\\S]+?' + escape_regexp(Kaete.TAG_COMMENT_END)

            // end of non-capturing group, end of tag, end of rexexp (with global flag)
            + ')' + escape_regexp(Kaete.TAG_END), 'g');

    }

    var print_array_name = '__Kaete_print';
    var context_name = '__Kaete_context';

    var escape_html_regexp = /[&<>"'\/]/g;
    Kaete.escape_html = function(s) {
        return ("" + s).replace(escape_html_regexp, function(match) {
            return '&#' + match.charCodeAt(0) + ';';
        });
    }


    Kaete.prototype.compile = function() {
        // Compiler state variables
        var last_match_end = 0,  // End of the last tag match in template
            // Whether or not what the compiler's parsing is to be printed
            print_mode = false,
            // An arry to push compiled statements to
            statements = [];

        if (!parser) {
            generate_parser();
        }

        // Compile a variable and push output onto statements
        var compile_variable = function(expression, unescaped) {
            if (expression) {
                if (print_mode) {
                    statements.push(",\n");
                } else {
                    print_mode = true;
                    statements.push(print_array_name, ".push(")
                }

                if (!unescaped) {
                    statements.push('Kaete.escape_html(');
                }

                statements.push(expression);

                if (!unescaped) {
                    statements.push(')');
                }
            }
        }

        var compile_string = function(string) {
            if (string) {
                compile_variable(JSON.stringify(string), true);
            }
        }

        var compile_code = function(code) {
            if (code) {
                if (print_mode) {
                    statements.push(");\n");
                    print_mode = false;
                }

                statements.push(code, "\n");
            }
        }

        // Build function beginning
        statements.push(
            "var ", print_array_name, " = [];\n",
            "var print_unescaped = function() { ", print_array_name, ".push.apply(", print_array_name, ", arguments); };\n",
            "var print = function() { for (var i = 0; i < arguments.length; i++) { ", print_array_name, ".push(Kaete.escape_html(arguments[i])); }; };\n",
            "with (", context_name, ") {\n");

        // Walk through template looking for template tags
        var match;
        while (match = parser.exec(this.template)) {
            // Refer to PARSER for match indexes
            compile_string(this.template.slice(last_match_end, match.index));
            compile_code(match[1]);
            compile_variable(match[3], match[2]);

            last_match_end = match.index + match[0].length;
        }

        // Compile left over text
        compile_string(this.template.substr(last_match_end));

        // Close off an open bracket if in print mode
        if (print_mode) {
            statements.push(");");
        }

        statements.push("\n};\n",
            "return ", print_array_name, '.join("");');

        this.func_body = statements.join("");
        try {
            this.func = new Function(context_name, this.func_body);
        } catch (exception) {
            this.func = function() { return "<p>Error compiling template: " + Kaete.escape_html(exception.message) + "</p>"; };
        }
    }

    Kaete.prototype.render = function(context) {
        // Call with global scope
        try {
            return this.func.call(global, context || {});
        } catch (exception) {
            return "<p>Error rendering template: " + Kaete.escape_html(exception.message) + "</p>";
        }
    }

    Kaete.render = function(template, context) {
        var t = new Kaete(template);
        return t.render(context);
    }

    Kaete.configure = function(options) {
        if (options) {
            for (var option in options) {
                // make sure it's uppercase in a naive attempt to safeguard the namespace
                if (/^[A-Z_0-9]+$/.test(option) && (typeof Kaete[option] !== "undefined")) {
                    Kaete[option] = options[option];
                } else {
                    alert("Kaete.configure(): Invalid option. [" + option + "="
                        + JSON.stringify(options[option]) + "]");
                }
            }
        }

        generate_parser();
    }

}).call(this);
