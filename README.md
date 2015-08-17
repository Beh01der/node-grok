# node-grok

This library is inspired by logstash grok filter but it's not a port of it.

This is a templating library that helps reusing existing regular expressions and constructing new, more complex one. The primary goal was to help parsing and transforming plain text logs into JSON objects (one line => one object) based on provided template. 

## Install
Install locally: `npm install node-grok`.

## Quick start
Following simple snippet
```javascript
var p = '%{IP:client} \\[%{TIMESTAMP_ISO8601:timestamp}\\] "%{WORD:method} %{URIHOST:site}%{URIPATHPARAM:url}" %{INT:code} %{INT:request} %{INT:response} - %{NUMBER:took} \\[%{DATA:cache}\\] "%{DATA:mtag}" "%{DATA:agent}"';
var str = '65.19.138.33 [2015-05-13T08:04:43+10:00] "GET datasymphony.com.au/ru/feed/" 304 385 0 - 0.140 [HIT] "-" "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)"';

require('node-grok').loadDefault(function (patterns) {
    var pattern = patterns.createPattern(p);
    pattern.parse(str, function (err, result) {
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

In order to be able to reuse existing patterns you can inject an existing pattern definition into your search pattern by using the dollar notation like this:
```javascript
var p = '${HAPROXYHTTP}"';
var str = 'Aug 17 12:06:27 minion haproxy[3274]: 10.146.248.54:50901 [17/Aug/2015:12:06:27.379] http-in backend_gru/minion_8080 1/0/0/142/265 200 259 - - ---- 0/0/0/0/0 0/0 "GET /ping HTTP/1.1"';

require('node-grok').loadDefault(function (patterns) {
    var pattern = patterns.createPattern(p);
    pattern.parse(str, function (err, result) {
        console.log(result);
    });
});
```
will transform a `HAProxy` log entry
```
Aug 17 12:06:27 minion haproxy[3274]: 1.2.3.4:50901 [17/Aug/2015:12:06:27.379] http-in backend_gru/minion_8080 1/0/0/142/265 200 259 - - ---- 0/0/0/0/0 0/0 "GET /ping HTTP/1.1""
```
into object
```json
{ syslog_timestamp: 'Aug 17 12:06:27',
  syslog_server: 'minion',
  client_ip: '1.2.3.4',
  client_port: '50901',
  accept_date: '17/Aug/2015:12:06:27.379',
  frontend_name: 'http-in',
  backend_name: 'backend_gru',
  server_name: 'minion_8080',
  time_request: '1',
  time_queue: '0',
  time_backend_connect: '0',
  time_backend_response: '142',
  time_duration: '265',
  http_status_code: '200',
  bytes_read: '259',
  captured_request_cookie: '-',
  captured_response_cookie: '-',
  termination_state: '----',
  actconn: '0',
  feconn: '0',
  beconn: '0',
  srvconn: '0',
  retries: '0',
  srv_queue: '0',
  backend_queue: '0',
  http_verb: 'GET',
  http_request: '/v2/deployments',
  http_version: '1.1' }
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
