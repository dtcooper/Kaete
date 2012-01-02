(function() {
    var global = this;

    var cache = {};

    var Kaete = global.Kaete = function(template) {
        this.template = template;  // TODO: No need to store this

        if (typeof cache[template] === "undefined") {
            this.compile();
            cache[template] = this.func;
        } else {
            this.func = cache[template];
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

    var escape_regexp = function(s) {
        return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    var parser;

    var generate_parser = function() {
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

    // TODO: Obfuscate these a little more
    var print_array_name = '__p';
    var context_name = '__context';
    var comment_index_marker = '__index-marker';

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

        var index_comment = function(index) {
            if (typeof index === "number") {
                statements.push("/* ", comment_index_marker, ":", index, " */ ");
            }
        }

        // Compile a variable and push output onto statements
        var compile_variable = function(expression, unescaped, index) {
            if (expression) {
                if (print_mode) {
                    statements.push(",");
                } else {
                    print_mode = true;
                    statements.push(print_array_name, ".push(")
                }
                statements.push("\n");

                index_comment(index);

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

        var compile_code = function(code, index) {
            if (code) {
                if (print_mode) {
                    statements.push(");\n");
                    print_mode = false;
                }

                index_comment(index);

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
            var match_index = match.index;

            // Refer to PARSER for match indexes
            compile_string(this.template.slice(last_match_end, match_index));
            compile_code(match[1], match_index);
            compile_variable(match[3], match[2], match_index);

            last_match_end = match_index + match[0].length;
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
            if (exception.lineNumber) {
                // line below is 4 lines away from the original exception, hence + 4 (first line = 0)
                var error_line_number = exception.lineNumber - exception.constructor("").lineNumber + 4;
                this.explain_error(exception.message, error_line_number);
            }
            console.log("Error compiling template.\n\n" + exception.message);
        }
    }

    Kaete.prototype.render = function(context) {
        if (this.func) {
            try {
                // Call with global scope
                return this.func.call(global, context || {});
            } catch (exp) {
                console.log("Error rendering template.\n\n" + exp.message);
                return "Couldn't render template.";
            }
        } else {
            if (this.error_explained) {
                return this.error_explained;
            } else {
                return "Couldn't compile template.";
            }
        }
    }

    Kaete.prototype.explain_error = function(message, line_number) {
        console.log("Explaining error in this.func_code around line #" + line_number);

        var func_lines = this.func_body.split("\n");
        var template_error_index = -1;
        var matcher = new RegExp("^\\/\\* " + escape_regexp(comment_index_marker) + ":(\\d+) ");

        for (var i = line_number; (i >= 0) && (i < func_lines.length); i--) {
            var line = func_lines[i];
            var match = line.match(matcher);

            if (match) {
                var template_error_index = parseInt(match[1]);
                break;
            }
        }

        if (template_error_index > -1) {
            console.log("Error index in this.template is " + template_error_index);
        } else {
            console.log("Couldn't find an error index in this.template ");
        }

        var template_before = this.template.substr(0, template_error_index);
        var template_after_lines = this.template.substr(template_error_index).split("\n");
        var template_after_first_line = template_after_lines[0];
        var template_after_rest = template_after_lines.slice(1).join("\n");


        var last_line_idx = template_before.lastIndexOf('\n');
        var error_space_offset = "";
        if (last_line_idx >= 0) {
            error_space_offset = Array(template_before.substr(last_line_idx).length).join(" ");
        }

        this.error_explained = "<pre>" + Kaete.escape_html(template_before)
            + Kaete.escape_html(template_after_first_line) + "\n" + error_space_offset
            + '<span style="font-weight: bold; color: red;">^ '
            + message + '</span>\n' + Kaete.escape_html(template_after_rest) + '</pre>';
    }

    Kaete._clear_cache = function() {  // TODO: Delete this helper
        cache = {};
    }

    Kaete.render = function(template, context) {
        var t = new Kaete(template);
        return t.render(context);
    }

    Kaete.configure = function(options) {
        if (options) {
            for (var option in options) {
                // make sure it's uppercase in a naive attempt to safeguard the namespace
                if (/^[A-Z_0-9]+$/.test(option) && (typeof Kaete[option] != 'undefined')) {
                    Kaete[option] = options[option];
                } else {
                    alert("Kaete.configure() -- Invalid option: " + option);
                }
            }
        }

        generate_parser();
    }

}).call(this);
