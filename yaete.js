(function() {
    var global = this;

    var cache = {};

    // The beginning special char, eg the "<" in "<% ... %>"
    var TAG_START = global.YAETE_TAG_START || '<';

    // The ending special char, eg the ">" in "<% ... %>"
    var TAG_END = global.YAETE_TAG_END || '>';

    // The beginning code tag type char, eg the left "%" in "<% ... %>"
    var TAG_CODE_START = global.YAETE_TAG_CODE_START || '%';

    // The ending code tag type char, eg the right "%" in "<% ... %>"
    var TAG_CODE_END = global.YAETE_TAG_CODE_END || '%';

    // The beginning comment tag type char, eg the left "#" in "<# ... #>"
    var TAG_COMMENT_START = global.YAETE_TAG_COMMENT_START || '#';

    // The ending comment tag type char, eg the right "#" in "<# ... #>"
    var TAG_COMMENT_END = global.YAETE_TAG_COMMENT_END || '#';

    // The beginning literal tag type char, eg the inner left "<" in "<< ... >>"
    var TAG_LITERAL_START = global.YAETE_TAG_LITERAL_START || '<';

    // The ending literal tag type char, eg the inner right ">" in "<< ... >>"
    var TAG_LITERAL_END = global.YAETE_TAG_LITERAL_END || '>';

    // The literal unescaped signifier, eg the "!" in "<<! ... >>"
    var TAG_LITERAL_UNESCAPED = global.YAETE_TAG_LITERAL_UNESCAPED || '!';

    var escape_regexp = function(s) {
        return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    var PARSER = new RegExp(
        // group 1: text, non-greedy
        '([\\s\\S]*?)'

        // Group 2: start of entire tag
        + '(' + escape_regexp(TAG_START)

        // group 3: start of tag type
        + '(' + escape_regexp(TAG_CODE_START) + '|' + escape_regexp(TAG_LITERAL_START) + ')'

        // group 4: unescape token for tag literal only
        + '(' + escape_regexp(TAG_LITERAL_UNESCAPED) + '?)'

        // group 5: code, non-greedy
        + '([\\s\\S]+?)'

        // group 6: end of tag type
        + '(' + escape_regexp(TAG_CODE_END) + '|' + escape_regexp(TAG_LITERAL_END) + ')'

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

    var print_array_name = 'p';

    var Yaete = global.Yaete = function(template) {
        this.template = template;

        if (cache[template] === undefined) {
            this.compile();
            cache[template] = this.func;
        } else {
            console.log("cache hit");
            this.func = cache[template];
        }

        return;

   }

    Yaete.escape_html = function(s) {
        return s.replace(/[&<>"'\/]/g, function(match) {
            return '&#' + match.charCodeAt(0) + ';';
        });
    }

    Yaete.prototype.compile = function() {
        // state machine for the compiler
        var state = {
            match_offset: 0,
            in_string: false
        }

        var stripped_template = this.template.replace(COMMENT_STRIPPER, '');

        var compile_literal = function(code) {
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

        var compile_string = function(string) {
            return compile_literal(JSON.stringify(string));
        }

        var compile_code = function(code) {
            var statements = [];

            if (state.in_string) {
                statements.push("); ");
                state.in_string = false;
            }

            statements.push(code);
            return statements.join("");
        }

        // Main parser for
        var func_body = stripped_template.replace(PARSER, function(match, text, tag, tag_start, unescape, code, tag_end, offset) {
            // sanity check to make sure match_offset == offset
            // probably can delete after unit testing
            if (state.match_offset != offset) {
                alert("state.match_offset (" + state.match_offset + ") != offset (" + offset + ")");
            }

            var statements = [];

            // update position to end of match
            state.match_offset = offset + match.length;

            if (text) {
                statements.push(compile_string(text));
            }

            // Compilation for code type
            switch (tag_start) {
                case TAG_CODE_START:
                    // Include unescape token (if it exists)
                    if (tag_end == TAG_CODE_END) {
                        statements.push(compile_code(unescape + code));
                    } else {
                        // invalid end token, compile as string
                        statements.push(compile_string(tag));
                    }
                    break;

                case TAG_LITERAL_START:
                    if (tag_end == TAG_LITERAL_END) {
                        if (unescape) {
                            statements.push(compile_literal(code));
                        } else {
                            statements.push(compile_literal('Yaete.escape_html(' + code + ')'));
                        }
                    } else {
                        // invalid end token, compile as string
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

        func_body = "var " + print_array_name + " = [];\n"
            + "var print = function() { " + print_array_name + ".push.apply(" + print_array_name + ", arguments); };\n"
            + "with (context) {\n"
            + func_body
            + "\n}\n"
            + "return " + print_array_name + '.join("");';

        this.func_body = func_body;
        this.func = new Function("context", func_body);
    }

    Yaete.prototype.render = function(context) {
        // Call using global scope
        return this.func.apply(global, [context || {}]);
    }

    Yaete.render = function(template, context) {
        var t = new Yaete(template);
        return t.render(context);
    }

}).apply(this);
