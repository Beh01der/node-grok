var grok = require('./index.js');
var expect = require("chai").expect;

function testParse(p, str, expected, done) {
	grok.loadDefault(function (err, patterns) {
		expect(err).to.be.null;

		var pattern = patterns.createPattern(p);
		pattern.parse(str, function (err, result) {
			expect(err).to.be.null;
			expect(result).to.be.eql(expected);
			done();
		});
	});
}

describe('grok', function() {
	describe('loadDefault', function() {
		it('is asynchronous', function() {
			var isDone = false;

			grok.loadDefault(function(patterns) {
				isDone = true;
			});

			expect(isDone, 'was done immediately after return').to.be.false;
		});
	});

	describe('#parseSync()', function () {
		it('returns null when a parse fails', function() {
			var patterns = grok.loadDefaultSync();
			var pattern = patterns.createPattern('%{WORD:verb} %{WORD:adjective}');

			var result = pattern.parseSync('test');
			expect(result).to.be.null;
		});
	});

	describe('#parse()', function () {
		
		it('is asynchronous', function(done) {
			grok.loadDefault(function (err, patterns) {
				expect(err).to.be.null;

				var pattern = patterns.createPattern('%{WORD:verb}');
				var isDone = false;

				pattern.parse('test', function(err, result) {
					isDone = true;
				});

				expect(isDone).to.be.false;
				done();
			});
		});

		it('returns null when a parse fails', function(done) {
			grok.loadDefault(function (err, patterns) {
				expect(err).to.be.null;

				var pattern = patterns.createPattern('%{WORD:verb} %{WORD:adjective}');

				pattern.parse('test', function(err, result) {
					expect(err).to.not.exist;
					expect(result).to.be.null;
					done();
				});
			});
		});

		it('parses to attributes with uppercase in their names', function(done) {
			grok.loadDefault(function (err, patterns) {
				expect(err).to.be.null;

				var pattern = patterns.createPattern('%{WORD:verb} %{WORD:testVariable}');

				pattern.parse('test worp', function(err, result) {
					expect(err).to.not.exist;
					expect(result).to.deep.equal({verb: 'test', testVariable: 'worp'});
					done();
				});
			});
		});

		it('should parse a simple custom pattern', function (done) {
			var p   = '(?<verb>\\w+)\\s+(?<url>/\\w+)';
			var str = 'DELETE /ping HTTP/1.1';
			var expected = {
				verb: 'DELETE',
				url:  '/ping'
			};

			testParse(p, str, expected, done);
		});
		
		it('should parse a pattern with some default patterns', function (done) {
			var p   = '%{WORD:verb} %{URIPATH:url}';
			var str = 'DELETE /ping HTTP/1.1';
			var expected = {
				verb: 'DELETE',
				url:  '/ping'
			};

			testParse(p, str, expected, done);
		});

		it('should parse a pattern with optional parts correctly #1', function (done) {
			var p   = '(?<all>(%{WORD:verb} %{URIPATH:url}|(?<alternative>\\(ALTERNATIVE\\))))';
			var str = 'DELETE /ping HTTP/1.1';
			var expected = {
				all: 'DELETE /ping',
				verb: 'DELETE',
				url:  '/ping'
			};

			testParse(p, str, expected, done);
		});

		it('should parse a pattern with optional parts correctly #2', function (done) {
			var p   = '(?<all>(%{WORD:verb} %{URIPATH:url}|(?<alternative>\\(ALTERNATIVE\\))))';
			var str = '(ALTERNATIVE)';
			var expected = {
				all:         '(ALTERNATIVE)',
				alternative: '(ALTERNATIVE)'
			};

			testParse(p, str, expected, done);
		});
		
		
		it('should parse parts of the default HAPROXYHTTP pattern', function (done) {
			var p   = '(<BADREQ>|(%{WORD:http_verb} (%{URIPROTO:http_proto}://)?(?:%{USER:http_user}(?::[^@]*)?@)?(?:%{URIHOST:http_host})?(?:%{URIPATHPARAM:http_request})?( HTTP/%{NUMBER:http_version})?))';
			var str = 'GET /ping HTTP/1.1';
			var expected = {
				http_verb:                'GET',
				http_request:             '/ping',
				http_version:             '1.1'
			};

			testParse(p, str, expected, done);
		});

		it('should parse the full default HAPROXYHTTP pattern', function (done) {
			var p   = '%{HAPROXYHTTP:haproxy}';
			var str = 'Aug 17 12:06:27 minion haproxy[3274]: 1.2.3.4:50901 [17/Aug/2015:12:06:27.379] http-in backend_gru/minion_8080 1/0/0/142/265 200 259 - - ---- 0/0/0/0/0 0/0 "GET /ping HTTP/1.1"';
			var expected = {
				haproxy:                  str,
				syslog_timestamp:         'Aug 17 12:06:27',
				syslog_server:            'minion',
				pid:                      '3274',
				program:                  'haproxy',
				client_ip:                '1.2.3.4',
				client_port:              '50901',
				accept_date:              '17/Aug/2015:12:06:27.379',
				haproxy_hour:             '12',
				haproxy_milliseconds:     '379',
				haproxy_minute:           '06',
				haproxy_month:            'Aug',
				haproxy_monthday:         '17',
				haproxy_second:           '27',
				haproxy_time:             '12:06:27',
				haproxy_year:             '2015',
				frontend_name:            'http-in',
				backend_name:             'backend_gru',
				server_name:              'minion_8080',
				time_request:             '1',
				time_queue:               '0',
				time_backend_connect:     '0',
				time_backend_response:    '142',
				time_duration:            '265',
				http_status_code:         '200',
				bytes_read:               '259',
				captured_request_cookie:  '-',
				captured_response_cookie: '-',
				termination_state:        '----',
				actconn:                  '0',
				feconn:                   '0',
				beconn:                   '0',
				srvconn:                  '0',
				retries:                  '0',
				srv_queue:                '0',
				backend_queue:            '0',
				http_verb:                'GET',
				http_request:             '/ping',
				http_version:             '1.1'
			};

			testParse(p, str, expected, done);
		});

		it('should parse the sample pattern of the README.md', function (done) {
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

			testParse(p, str, expected, done);
		});
		
	});
});

describe('GrokCollection', function() {
	describe('load', function() {
		it('is asynchronous', function() {
			var coll = new grok.GrokCollection();
			var isDone = false;

			coll.load(require.resolve('./patterns/grok-patterns'), function() {
				isDone = true;
			});

			expect(isDone, 'was done immediately after return').to.be.false;
		});
	});

	describe('loadSync', function() {
		it('returns number of patterns', function() {
			var coll = new grok.GrokCollection();
			var result = coll.loadSync(require.resolve('./patterns/grok-patterns'));

			expect(result, 'should match number of loaded patterns').to.equal(coll.count());
		});
	});
});
