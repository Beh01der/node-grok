var fs = require('fs');
var async = require('async');
var OnigRegExp = require('oniguruma').OnigRegExp;
var Map = require('collections/fast-map');

function GrokPattern(expression, id) {
    var t = this;
    t.id = id;
    t.expression = expression;
    t.fields = [ null ]; // add a dummy entry at the beginning to swallow the fully captured expression
    t.resolved = null;
    t.regex = null;

    t.parse = function(str, next) {
        if (!t.regexp) {
            t.regexp = new OnigRegExp(t.resolved);
        }

        t.regexp.search(str, function(err, result) {
            if(err || !result)
                return next(err, result);

            var r = {};

            result.forEach(function(item, index) {
                var field = t.fields[index];
                if(field && item.match) {
                    r[field] = item.match;
                }
            });

            return next(err, r, result);
        });
    };

    t.parseSync = function(str) {
        if (!t.regexp) {
            t.regexp = new OnigRegExp(t.resolved);
        }

        var result = t.regexp.searchSync(str);

        if(!result)
            return null;

        var r = {};

        result.forEach(function(item, index) {
            var field = t.fields[index];
            if(field && item.match) {
                r[field] = item.match;
            }
        });

        return r;
    };
}

var subPatternsRegex      = /%\{[A-Z0-9_]+(?::[A-Za-z0-9_]+)?\}/g; // %{subPattern} or %{subPattern:fieldName}
var nestedFieldNamesRegex = /(\(\?<([A-Za-z0-9_]+)>)|\(\?:|\(\?>|\(\?!|\(\?<!|\(|\\\(|\\\)|\)|\[|\\\[|\\\]|\]/g;

function GrokCollection() {
    var t = this;

    var patterns = new Map();

    function resolvePattern (pattern) {
        pattern = resolveSubPatterns(pattern);
        pattern = resolveFieldNames(pattern);
        return pattern;
    }

    // detect references to other patterns
    // TODO: support automatic type conversion (e.g., "%{NUMBER:duration:float}"; see: https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html)
    function resolveSubPatterns (pattern) {
        if(!pattern) { return; }

        var expression  = pattern.expression;
        var subPatterns = expression.match(subPatternsRegex) || [];

        subPatterns.forEach(function (matched) {
            // matched is: %{subPatternName} or %{subPatternName:fieldName}
            var subPatternName = matched.substr(2, matched.length - 3);

            var elements   = subPatternName.split(':');
            subPatternName = elements[0];
            var fieldName  = elements[1];

            var subPattern = patterns.get(subPatternName);
            if (!subPattern) {
                console.error('Error: pattern "' + subPatternName + '" not found!');
                return;
            }

            if (!subPattern.resolved) {
                resolvePattern(subPattern);
            }

            if (fieldName) {
                expression = expression.replace(matched, '(?<' + fieldName + '>' + subPattern.resolved + ')');
            } else {
                expression = expression.replace(matched, subPattern.resolved);
            }
        });

        pattern.resolved = expression;
        return pattern;
    }

    // create mapping table for the fieldNames to capture
    function resolveFieldNames (pattern) {
        if(!pattern) { return; }

        var nestLevel = 0;
        var inRangeDef = 0;
        var matched;
        while ((matched = nestedFieldNamesRegex.exec(pattern.resolved)) !== null) {
            switch(matched[0]) {
                case '(':    { if(!inRangeDef) { ++nestLevel; pattern.fields.push(null); } break; }
                case '\\(':  break; // can be ignored
                case '\\)':  break; // can be ignored
                case ')':    { if(!inRangeDef) { --nestLevel; } break; }
                case '[':    { ++inRangeDef; break; }
                case '\\[':  break; // can be ignored
                case '\\]':  break; // can be ignored
                case ']':    { --inRangeDef; break; }
                case '(?:':  // fallthrough                              // group not captured
                case '(?>':  // fallthrough                              // atomic group
                case '(?!':  // fallthrough                              // negative look-ahead
                case '(?<!': { if(!inRangeDef) { ++nestLevel; } break; } // negative look-behind
                default:     { ++nestLevel; pattern.fields.push(matched[2]); break; }
            }
        }

        return pattern;
    }

    var patternLineRegex = /^([A-Z0-9_]+)\s+(.+)/;
    var splitLineRegex = /\r?\n/;

    function doLoad(file) {
        var i = 0;

        if (file) {
            var lines = file.toString().split(splitLineRegex);
            if (lines && lines.length) {
                lines.forEach(function (line) {
                    var elements = patternLineRegex.exec(line);
                    if (elements && elements.length > 2) {
                        var pattern = new GrokPattern(elements[2], elements[1]);
                        patterns.set(pattern.id, pattern);
                        i++;
                    }
                });
            }
        }

        return i;
    }

    t.createPattern = function (expression, id) {
        id = id || 'pattern-' + patterns.length;
        if (patterns.has(id)) {
            console.error('Error: pattern with id %s already exists', id);
        } else {
            var pattern = new GrokPattern(expression, id);
            resolvePattern(pattern);
            patterns.set(id, pattern);
            return pattern;
        }
    };

    t.getPattern = function (id) {
        return patterns.get(id);
    };

    t.load = function (filePath, callback) {
        fs.readFile(filePath, function(err, file) {
            if(err)
                return callback(err);

            doLoad(file);
            return callback();
        });
    };

    t.loadSync = function(filePath) {
        return doLoad(fs.readFileSync(filePath));
    };

    t.count = function () {
        return patterns.length;
    };
}

var patternsDir = __dirname + '/patterns/';

function doLoadDefaultSync(loadModules) {
    var result = new GrokCollection();

    var files = fs.readdirSync(patternsDir);
    if (files && files.length) {
        files.filter(function(file) {
            return !loadModules || !loadModules.length || loadModules.indexOf(file) !== -1;
        }).forEach(function (file) {
            result.loadSync(patternsDir + file);
        })
    }

    return result;
}

function doLoadDefault(loadModules, callback) {
    return fs.readdir(patternsDir, function(err, files) {
        if(err)
            return callback(err);

        var result = new GrokCollection();

        return async.parallel(
            files.filter(function(file) {
                return !loadModules || !loadModules.length || loadModules.indexOf(file) !== -1;
            }).map(function (file) {
                return function(callback) {
                    return result.load(patternsDir + file, callback);
                };
            }),
            function(err) {
                if(err)
                    return callback(err);

                return callback(null, result);
            });
    });
}

module.exports = {
    loadDefault: function (loadModules, callback) {
        if(arguments.length < 2) {
            callback = loadModules;
            loadModules = null;
        }

        doLoadDefault(loadModules, callback);
    },

    loadDefaultSync: doLoadDefaultSync,

    GrokCollection: GrokCollection
};