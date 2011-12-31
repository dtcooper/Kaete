(function() {
    var global = this;

    var cache = {};

    // The beginning special char, eg the "[" in "[% ... %]"
    var TAG_START = global.KAETE_TAG_START || '[';

    // The ending special char, eg the "]" in "[% ... %]"
    var TAG_END = global.KAETE_TAG_END || ']';

    // The beginning code tag type char, eg the left "%" in "[% ... %]"
    var TAG_CODE_START = global.KAETE_TAG_CODE_START || '%';

    // The ending code tag type char, eg the right "%" in "[% ... %]"
    var TAG_CODE_END = global.KAETE_TAG_CODE_END || '%';

    // The beginning comment tag type char, eg the left "#" in "[# ... #]"
    var TAG_COMMENT_START = global.KAETE_TAG_COMMENT_START || '#';

    // The ending comment tag type char, eg the right "#" in "[# ... #]"
    var TAG_COMMENT_END = global.KAETE_TAG_COMMENT_END || '#';

    // The beginning variable tag type char, eg the inner left "[" in "[[ ... ]]"
    var TAG_VARIABLE_START = global.KAETE_TAG_VARIABLE_START || '[';

    // The ending variable tag type char, eg the inner right "]" in "[[ ... ]]"
    var TAG_VARIABLE_END = global.KAETE_TAG_VARIABLE_END || ']';

    // The unescaped variable signifier, eg the "*" in "[[* ... ]]"
    var TAG_VARIABLE_UNESCAPED = global.KAETE_TAG_VARIABLE_UNESCAPED || '*';

    var escape_regexp = function(s) {
        return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    var PARSER = new RegExp(
        // Start of tag, start of non-capturing group for tag types.
        escape_regexp(TAG_START) + '(?:'

        // Match a code tag, group 1 as matched code, end of code tag;
        + escape_regexp(TAG_CODE_START) + '([\\s\\S]+?)' + escape_regexp(TAG_CODE_END)

        // or match a variable tag, group 2 as the optional unescape char,
        + '|' + escape_regexp(TAG_VARIABLE_START) + '(' + escape_regexp(TAG_VARIABLE_UNESCAPED) + '?)'

        // group 3 as matched expression, end of variable tag;
        + '([\\s\\S]+?)' + escape_regexp(TAG_VARIABLE_END)

        // or match a complete comment tag, no need to group
        + '|' + escape_regexp(TAG_COMMENT_START) + '[\\s\\S]+?' + escape_regexp(TAG_COMMENT_END)

        // end of non-capturing group, end of tag, end of rexexp (with global flag)
        + ')' + escape_regexp(TAG_END), 'g');

    // TODO: Obfuscate these a little more
    var print_array_name = '__p';
    var context_name = '__context';


    var Kaete = global.Kaete = function(template) {
        this.template = template;  // TODO: No need to store this

        if (cache[template] === undefined) {
            this.compile();
            cache[template] = this.func;
        } else {
            this.func = cache[template];
        }

        return;

    }


    Kaete.escape_html = function(s) {
        return ("" + s).replace(/[&<>"'\/]/g, function(match) {
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
        while (match = PARSER.exec(this.template)) {
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

        var func_body = statements.join("");
        try {
            this.func = new Function(context_name, func_body);
        } catch (exp) {
            alert("Error compiling template.\n\n" + exp.message);
            this.func = func_body;  // TODO: don't define function as a string (use null)
        }
    }

    Kaete.prototype.render = function(context) {
        if (typeof this.func == "function") {  // TODO: function should be null if not defined
            try {
                // Call with global scope
                return this.func.call(global, context || {});
            } catch (exp) {
                alert("Error rendering template.\n\n" + exp.message);
                return "Couldn't render template.";
            }
        } else {
            return "Couldn't compile template."
        }
    }

    Kaete._clear_cache = function() {  // TODO: Delete this helper
        cache = {};
    }

    Kaete.render = function(template, context) {
        var t = new Kaete(template);
        return t.render(context);
    }

}).call(this);
