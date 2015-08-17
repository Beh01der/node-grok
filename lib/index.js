var fs = require('fs');
var lineReader = require('line-reader');
var async = require('async');
var OnigRegExp = require('oniguruma').OnigRegExp;
var Map = require('collections/fast-map');

function GrokPattern(expression, id) {
    var t = this;
    t.id = id;
    t.expression = expression;
    t.fields = [];
    t.resolved = null;
    t.regex = null;

    t.parse = function(str, next) {
        if (!t.regexp) {
            t.regexp = new OnigRegExp(t.resolved);
        }

        t.regexp.search(str, function(err, result) {
            var i = 0;
            var r = {};

            if (!err && result && result.filter) {
                result.filter(function (item) {
                    return item.match;
                }).splice(1).forEach(function(item) {
                    r[t.fields[i++]] = item.match;
                });
            }

            next(err, r);
        });
    };
}

var nestedPatternsRegex = /%\{[A-Z0-9_]+(?::[a-z0-9_]+)?\}|\(\?<[a-z0-9]+>/g;
var injectPatternsRegex = /\$\{[A-Z0-9_]+(?::[a-z0-9_]+)?\}/g;
function GrokCollection() {
    var t = this;

    var patterns = new Map();

    function resolvePattern (pattern, isSubPattern) {
        // detect references to other patterns
        var expression = pattern.expression;

        // first check for injecting existing patterns via the "$" operator, e.g., via "${HAPROXYHTTP} ${MY_ADD_DATA}"
        var injPatterns = expression.match(injectPatternsRegex) || [];
        injPatterns.forEach(function (injPatternName) {
            var injectName = injPatternName.substr(2, injPatternName.length - 3);

            var injPattern = patterns.get(injectName);
            if (!injPattern) {
                console.log('Error: pattern "' + injectName + '" not found!');
                return;
            }

            expression = expression.replace(injPatternName, injPattern.expression);
        });

        var subPatterns = expression.match(nestedPatternsRegex) || [];
        subPatterns.forEach(function (subPatternName) {
            var fieldName;
            var isGrok = subPatternName.charAt(0) === '%';

            if (isGrok) {
                subPatternName = subPatternName.substr(2, subPatternName.length - 3);

                var elements = subPatternName.split(':');
                if (elements.length > 1) {
                    // has field name
                    subPatternName = elements[0];
                    fieldName = elements[1];
                    pattern.fields.push(fieldName);
                }

                var subPattern = patterns.get(subPatternName);
                if (!subPattern) {
                    console.log('Error: pattern "' + subPatternName + '" not found!');
                    return;
                }

                if (!subPattern.resolved) {
                    resolvePattern(subPattern, true);
                }

                if (fieldName) {
                    if (isSubPattern) {
                        expression = expression.replace('%{' + subPatternName + ':' + fieldName + '}', subPattern.resolved);
                    } else {
                        expression = expression.replace('%{' + subPatternName + ':' + fieldName + '}', '(' + subPattern.resolved + ')');
                    }
                } else {
                    expression = expression.replace('%{' + subPatternName + '}', subPattern.resolved);
                }

                if (subPattern.fields.length) {
                    //Array.prototype.push.apply(pattern.fields, subPattern.fields);
                }
            } else {
                fieldName = subPatternName.substr(3, subPatternName.length - 4);
                pattern.fields.push(fieldName);
                expression = expression.replace('?<' + fieldName + '>', '');
            }
        });

        pattern.resolved = expression;

        return pattern;
    }

    t.createPattern = function (expression, id) {
        id = id || 'pattern-' + patterns.length;
        if (patterns.has(id)) {
            console.log('Error: pattern with id %s already exists', id);
        } else {
            var pattern = new GrokPattern(expression, id);
            return resolvePattern(pattern);
        }
    };

    t.load = function (filePath, next) {
        var patternLineRegex = /([A-Z0-9_]+)\s+(.+)/;

        lineReader.eachLine(filePath, function(line) {
            var elements = patternLineRegex.exec(line);
            if (elements && elements.length > 2) {
                var pattern = new GrokPattern(elements[2], elements[1]);
                patterns.set(pattern.id, pattern);
            }
        }).then(function() {
            next();
        });
    };

    t.count = function () {
        return patterns.length;
    };
}

var defaultPatterns;
var patternsDir = __dirname + '/patterns/';
module.exports = {
    loadDefault: function (callback, loadModules) {
        if (defaultPatterns) {
            callback(defaultPatterns);
        } else {
            defaultPatterns = new GrokCollection();
            fs.readdir(patternsDir, function (err, files) {
                async.parallel(
                    files.filter(function(file) {
                        return !loadModules || !loadModules.length || loadModules.indexOf(file) !== -1;
                    }).map(function(file) {
                        return function (onFileProcessed) {
                            defaultPatterns.load(patternsDir + file, onFileProcessed);
                        };
                    }),
                    function (err) {
                        if (err) {
                            console.log('Error loading patterns: %s', err.message);
                        }
                        callback(defaultPatterns);
                    });
            });
        }

        return defaultPatterns;
    },

    GrokCollection: GrokCollection
};