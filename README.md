# node-grok

This library is inspired by logstash grok filter but it's not a port of it.

This is a templating library that helps reusing existing regular expressions and constructing new, more complex one. The primary goal was to help parsing and transforming plain text logs into JSON objects (one line => one object) based on provided template. 

## Install
Install locally: `npm install node-grok`.

## Quick start
Following simple snippet
```javascript
var p = '%{IP:client} \\[%{TIMESTAMP_ISO8601:timestamp}\\] "%{WORD:method} %{URIHOST:site}%{URIPATHPARAM:url}" %{INT:code} %{INT:request} %{INT:response} - %{NUMBER:took} \\[%{DATA:cache}\\] "%{DATA:mtag}" "%{DATA:agent}"';
var str = '65.19.138.33 [2015-05-13T08:04:43+10:00] "GET datasymphony.com.au/ru/feed/" 304 385 0 - 0.140 [HIT] "-" "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)"\n';

require('node-grok').loadDefault(function (patterns) {
    var pattern = patterns.createPattern(p);
    pattern.parse(str, function (err, obj) {
        console.log(result);
    });
});
```
will transform string
```
65.19.138.33 [2015-05-13T08:04:43+10:00] "GET datasymphony.com.au/ru/feed/" 304 385 0 - 0.140 [HIT] "-" "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)"
```
into object
```json
{
  "client": "65.19.138.33",
  "timestamp": "2015-05-13T08:04:43+10:00",
  "method": "GET",
  "site": "datasymphony.com.au",
  "url": "/ru/feed/",
  "code": "304",
  "request": "385",
  "response": "0",
  "took": "0.140",
  "cache": "HIT",
  "mtag": "-",
  "agent": "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)" 
}
```
## API
* **loadDefault(callback, [loadModules])** - creates default pattern collection including all built-in patterns from `./patterns` folder. By providing *loadModules* parameter you can limit number of loaded patterns: `loadDefault(..., ['grok-patterns']);`. Callback receives *patterns* collection filled in with default templates: `function(patterns)`

* **GrokCollection.createPattern(expression, [id])** - creates new pattern and adds it to the collection. Find out more about pattern syntax [here](http://logstash.net/docs/1.4.2/filters/grok) and about regular expression syntax [here](http://www.geocities.jp/kosako3/oniguruma/doc/RE.txt)

* **GrokCollection.load(filePath, next)** - loads patterns from file

* **GrokPattern.parse(str, callback)** - parses string using corresponding pattern. Callback function receives optional *error* and resulting object *result*: `function(error, result)`

## License 
**ISC License (ISC)**

Copyright (c) 2015, Andrey Chausenko <andrey.chausenko@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
