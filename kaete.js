(function() {
    var global = this;

    var cache = {};

    // The beginning special char, eg the "<" in "<% ... %>"
    var TAG_START = global.KAETE_TAG_START || '<';

    // The ending special char, eg the ">" in "<% ... %>"
    var TAG_END = global.KAETE_TAG_END || '>';

    // The beginning code tag type char, eg the left "%" in "<% ... %>"
    var TAG_CODE_START = global.KAETE_TAG_CODE_START || '%';

    // The ending code tag type char, eg the right "%" in "<% ... %>"
    var TAG_CODE_END = global.KAETE_TAG_CODE_END || '%';

    // The beginning comment tag type char, eg the left "#" in "<# ... #>"
    var TAG_COMMENT_START = global.KAETE_TAG_COMMENT_START || '#';

    // The ending comment tag type char, eg the right "#" in "<# ... #>"
    var TAG_COMMENT_END = global.KAETE_TAG_COMMENT_END || '#';

    // The beginning variable tag type char, eg the inner left "<" in "<< ... >>"
    var TAG_VARIABLE_START = global.KAETE_TAG_VARIABLE_START || '<';

    // The ending variable tag type char, eg the inner right ">" in "<< ... >>"
    var TAG_VARIABLE_END = global.KAETE_TAG_VARIABLE_END || '>';

    // The unescaped variable signifier, eg the "!" in "<<! ... >>"
    var TAG_VARIABLE_UNESCAPED = global.KAETE_TAG_VARIABLE_UNESCAPED || '!';

    var escape_regexp = function(s) {
        return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    var PARSER = new RegExp(
        // group 1: text, non-greedy
        '([\\s\\S]*?)'

        // Group 2: start of entire tag
        + '(' + escape_regexp(TAG_START)

        // group 3: start of tag type
        + '(' + escape_regexp(TAG_CODE_START) + '|' + escape_regexp(TAG_VARIABLE_START) + ')'

        // group 4: unescape token for tag variable only
        + '(' + escape_regexp(TAG_VARIABLE_UNESCAPED) + '?)'

        // group 5: code, non-greedy
        + '([\\s\\S]+?)'

        // group 6: end of tag type
        + '(' + escape_regexp(TAG_CODE_END) + '|' + escape_regexp(TAG_VARIABLE_END) + ')'

        // end of tag, end of regexp
        + escape_regexp(TAG_END) + ')', 'g');


    var COMMENT_STRIPPER = new RegExp(
        // start of entire tag
        escape_regexp(TAG_START)

        // start of comment tag
        + escape_regexp(TAG_COMMENT_START)

        // comment, non-greedy
        + '([\\s\\S]+?)'

        // end of comment tag
        + escape_regexp(TAG_COMMENT_END)

        // end of tag, end of regexp
        + escape_regexp(TAG_END), 'g');

    var print_array_name = '__p';  // TODO: Obfuscate these more
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
        // State machine for the compiler
        var state = {
            match_offset: 0,
            in_string: false
        }

        // Strip out comments
        var stripped_template = this.template.replace(COMMENT_STRIPPER, '');

        // Helper for compiling a variable << ... >> tag in the parser
        var compile_variable = function(code) {
            var statements = [];

            if (state.in_string) {
                statements.push(", ");
            } else {
                state.in_string = true;
                statements.push(print_array_name + ".push(");
            }
            statements.push(code);

            return statements.join("");
        }

        // Helper for compiling a string, ie something not in a template tag
        var compile_string = function(string) {
            return compile_variable(JSON.stringify(string));
        }

        // Helper for compiling code, ie <% ... %>
        var compile_code = function(code) {
            var statements = [];

            if (state.in_string) {
                statements.push(");\n");
                state.in_string = false;
            }

            statements.push(code + "\n");
            return statements.join("");
        }

        // Main parser
        //
        // Goes through stripped_template replacing optional text followed by a
        // tag iteratively. When complete, func_body will be completely parsed
        // except for the characters in stripped_template after state.match_offset
        var func_body = stripped_template.replace(PARSER, function(match, text, tag, tag_start, unescape, code, tag_end, offset) {
            // sanity check to make sure match_offset == offset
            // TODO: can safely delete after testing
            if (state.match_offset != offset) {
                alert("state.match_offset (" + state.match_offset + ") != offset (" + offset + ")");
            }

            // list of statements to output
            var statements = [];

            // update position to end of match
            state.match_offset = offset + match.length;

            // compile text if some exsts
            if (text) {
                statements.push(compile_string(text));
            }

            // Compile code blocks
            switch (tag_start) {
                case TAG_CODE_START:
                    if (tag_end == TAG_CODE_END) {
                        // compile code, include unescape token (if it exists)
                        statements.push(compile_code(unescape + code));
                    } else {
                        // invalid end token, compile entire tag as string
                        statements.push(compile_string(tag));
                    }
                    break;

                case TAG_VARIABLE_START:
                    if (tag_end == TAG_VARIABLE_END) {
                        if (unescape) {
                            // compile unescaped variable expression
                            statements.push(compile_variable(code));
                        } else {
                            // compile escaped variable expression using Kaete.escape_html()
                            statements.push(compile_variable('Kaete.escape_html(' + code + ')'));
                        }
                    } else {
                        // invalid end token, compile entire tag as string
                        statements.push(compile_string(tag));
                    }
                    break;
            }

            return statements.join("");
        });

        // Finish compiling the trailing string
        if (state.match_offset < stripped_template.length) {
            var uncompiled_pos = func_body.length - stripped_template.length + state.match_offset;
            // strip off uncompiled chars from func_body, compile them
            func_body = func_body.substr(0, uncompiled_pos)
                + compile_string(func_body.substr(uncompiled_pos));
        }

        // Close open function, if one exists
        if (state.in_string) {
            func_body += ');';
        }

        // Wrap beginning and end of function with argument context
        func_body = "var " + print_array_name + " = [];\n"
            + "var print = function(s, u) { " + print_array_name + ".push(u ? s : Kaete.escape_html(s)); };\n"
            + "with (" + context_name + ") {\n"
            + func_body + "\n"
            + "};\n"
            + "return " + print_array_name + '.join("");';

        this.func_body = func_body;  // TODO: Don't need to store this
        try {
            this.func = new Function(context_name, func_body);
        } catch (exp) {
            alert("Error compiling template.\n\n" + exp.message);
            this.func = null;
        }
    }

    Kaete.prototype.render = function(context) {
        // Call with global scope
        if (this.func) {
            try {
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
