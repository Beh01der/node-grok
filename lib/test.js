var grok = require('./index.js');
var expect = require("chai").expect;

describe('grok', function() {
	describe('#parse()', function () {
		it('should parse the given explicit pattern correctly', function (done) {
			var p   = '%{IP:client} \\[%{TIMESTAMP_ISO8601:timestamp}\\] "%{WORD:method} %{URIHOST:site}%{URIPATHPARAM:url}" %{INT:code} %{INT:request} %{INT:response} - %{NUMBER:took} \\[%{DATA:cache}\\] "%{DATA:mtag}" "%{DATA:agent}"';
			var str = '65.19.138.33 [2015-05-13T08:04:43+10:00] "GET datasymphony.com.au/ru/feed/" 304 385 0 - 0.140 [HIT] "-" "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)"';
			var expected = {
				client:    '65.19.138.33',
				timestamp: '2015-05-13T08:04:43+10:00',
				method:    'GET',
				site:      'datasymphony.com.au',
				url:       '/ru/feed/',
				code:      '304',
				request:   '385',
				response:  '0',
				took:      '0.140',
				cache:     'HIT',
				mtag:      '-',
				agent:     'Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)'
			};

			grok.loadDefault(function (patterns) {
			    var pattern = patterns.createPattern(p);
			    pattern.parse(str, function (err, result) {
			    	expect(result).to.be.eql(expected);
			        done();
			    });
			});
		});
	});
});
