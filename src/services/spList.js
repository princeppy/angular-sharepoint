/**
 * @ngdoc service
 * @name ExpertsInside.SharePoint.$spList
 * @requires $spRest
 *
 * @description
 * A factory which creates a list object that lets you interact with SharePoint Lists via the
 * SharePoint REST API
 *
 * The returned list object has action methods which provide high-level behaviors without
 * the need to interact with the low level $http service.
 *
 * @return {Object} A list "class" object with the default set of resource actions
 */
angular.module('ExpertsInside.SharePoint')
  .factory('$spList', function($spRest, $http) {
    'use strict';
    var $spListMinErr = angular.$$minErr('$spList');

    function List(name, defaults) {
      if (!name) {
        throw $spListMinErr('badargs', 'name cannot be blank.');
      }

      this.name = name.toString();
      var upcaseName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
      this.defaults = angular.extend({
        itemType: 'SP.Data.' + upcaseName + 'ListItem'
      }, defaults);
      this.queries = {};
    }

    List.prototype = {
      $baseUrl: function() {
        return "web/lists/getByTitle('" + this.name + "')";
      },
      $buildHttpConfig: function(action, params, args) {
        var baseUrl = this.$baseUrl(),
            httpConfig;

        switch(action) {
        case 'get':
          httpConfig = ShareCoffee.REST.build.read.for.angularJS({
            url: baseUrl + '/items(' + args + ')'
          });
          break;
        case 'query':
          httpConfig = ShareCoffee.REST.build.read.for.angularJS({
            url: baseUrl + '/items'
          });
          break;
        case 'create':
          httpConfig = ShareCoffee.REST.build.create.for.angularJS({
            url: baseUrl + '/items',
            payload: args
          });
          break;
        case 'save':
          httpConfig = ShareCoffee.REST.build.update.for.angularJS({
            url: baseUrl,
            payload: args
          });
          httpConfig.url = args.__metadata.uri; // ShareCoffe doesnt work with absolute urls atm
          break;
        case 'delete':
          httpConfig = ShareCoffee.REST.build.update.for.angularJS({
            url: baseUrl,
          });
          httpConfig.url = args.__metadata.uri;
          break;
        }

        httpConfig.url = $spRest.appendQueryString(httpConfig.url, params);
        httpConfig.transformResponse = $spRest.transformResponse;

        return httpConfig;
      },
      $createResult: function(emptyObject, httpConfig) {
        var result = emptyObject;
        result.$promise = $http(httpConfig).success(function(data) {
          angular.extend(result, data);
          return result;
        });

        return result;
      },
      get: function(id, params) {
        if (angular.isUndefined(id)) {
          throw $spListMinErr('badargs', 'id is required.');
        }
        params = $spRest.normalizeParams(params);

        var httpConfig = this.$buildHttpConfig('get', params, id);

        return this.$createResult({Id: id}, httpConfig);
      },
      query: function(params) {
        params = $spRest.normalizeParams(params);

        var httpConfig = this.$buildHttpConfig('query', params);

        return this.$createResult([], httpConfig);
      },
      create: function(data) {
        var type = this.defaults.itemType;
        if (!type) {
          throw $spListMinErr('badargs', 'Cannot create an item without a valid type.' +
                              'Please set the default item type on the list (list.defaults.itemType).');
        }
        var itemDefaults = {
          __metadata: {
            type: type
          }
        };
        var item = angular.extend({}, itemDefaults, data);
        var httpConfig = this.$buildHttpConfig('create', undefined, item);

        return this.$createResult(item, httpConfig);
      },
      save: function(item) {
        if (angular.isUndefined(item.__metadata)) {
          throw $spListMinErr('badargs', 'Item must have __metadata property.');
        }
        var httpConfig = this.$buildHttpConfig('save', undefined, item);

        return this.$createResult(item, httpConfig);
      },
      delete: function(item) {
        if (angular.isUndefined(item.__metadata)) {
          throw $spListMinErr('badargs', 'Item must have __metadata property.');
        }
        var httpConfig = this.$buildHttpConfig('delete', undefined, item);

        return this.$createResult(item, httpConfig);
      },
      addNamedQuery: function(name, createParams) {
        var me = this;
        this.queries[name] = function() {
          var params = createParams.apply(me, arguments);
          return me.query(params);
        };
        return me;
      }
    };

    function listFactory(name, defaults) {
      return new List(name, defaults);
    }
    listFactory.List = List;

    return listFactory;
  });
