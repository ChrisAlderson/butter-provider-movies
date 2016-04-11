'use strict';

var _ = require('lodash');
var Generic = require('butter-provider');
var inherits = require('util').inherits;
var Q = require('q');
var querystring = require('querystring');
var request = require('request');
var sanitize = require('butter-sanitize');

var MovieApi = function(args) {
  var that = this;

  MovieApi.super_.call(this);

  if (args.apiURL) this.apiURL = args.apiURL.split(',');

  this.language = args.language;
  this.quality = args.quality;
  this.translate = args.translate;
};

inherits(MovieApi, Generic);

MovieApi.prototype.config = {
  name: 'MovieApi',
  uniqueId: 'imdb_id',
  tabName: 'MovieApi',
  type: 'movie',
  metadata: 'trakttv:movie-metadata'
};

MovieApi.prototype.extractIds = function(items) {
  return _.pluck(items.results, 'imdb_id');
};

MovieApi.prototype.fetch = function(filters) {
  var that = this;

  var params = {};
  params.sort = 'seeds';
  params.limit = '50';

  filters.page = 1;

  if (filters.keywords) {
    params.keywords = filters.keywords.replace(/\s/g, '% ');
  }

  if (filters.genre) {
    params.genre = filters.genre;
  }

  if (filters.order) {
    params.order = filters.order;
  }

  if (filters.sorter && filters.sorter !== 'popularity') {
    params.sort = filters.sorter;
  }

  function getFetch(index, url, that) {
    var deferred = Q.defer();

    var options = {
      url: url,
      json: true
    };

    var req = _.extend({}, that.apiURL[index], options);
    console.info('Request to MovieApi', req.url);
    request(req, function(err, res, data) {
      if (err || res.statusCode >= 400) {
        console.warn('MovieAPI endpoint \'%s\' failed.', that.apiURL[index]);
        if (index + 1 >= that.apiURL.length) {
          return deferred.reject(err || 'Status Code is above 400');
        } else {
          return get(index + 1, url);
        }
      } else if (!data || data.error) {
        err = data ? data.status_message : 'No data returned';
        console.error('API error:', err);
        return deferred.reject(err);
      } else {
        return deferred.resolve({
          results: sanitize(data),
          hasMore: true
        });
      }
    });

    return deferred.promise;
  };

  var index = 0;
  var url = that.apiURL[index] + 'movies/' + filters.page + '?' + querystring.stringify(params).replace(/%25%20/g, '%20');
  return getFetch(index, url, that);
};

MovieApi.prototype.detail = function(torrent_id, old_data, debug) {
  var that = this;
  debug === undefined ? debug = true : '';

  function getDetail(index, url, that) {
    var deferred = Q.defer();

    var options = {
      url: url,
      json: true
    };

    var req = _.extend({}, that.apiURL[index], options);
    console.info('Request to MovieApi', req.url);
    request(req, function(err, res, data) {
      if (err || res.statusCode >= 400) {
        console.warn('MovieAPI endpoint \'%s\' failed.', that.apiURL[index]);
        if (index + 1 >= that.apiURL.length) {
          return deferred.reject(err || 'Status Code is above 400');
        } else {
          return get(index + 1, url);
        }
      } else if (!data || data.error) {
        err = data ? data.status_message : 'No data returned';
        console.error('API error:', err);
        return deferred.reject(err);
      } else {
        return deferred.resolve(sanitize(data));
      }
    });

    return deferred.promise;
  };

  var index = 0;
  var url = that.apiURL[index] + 'movie/' + torrent_id;
  return getDetail(index, url, that);
};

module.exports = MovieApi;
