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

    function listFactory(name, options) {
      if (!angular.isString(name) || name === '') {
        throw $spListMinErr('badargs', 'name must be a nen-empty string.');
      }
      if(!angular.isObject(options)) {
        options = {};
      }
      var upcaseName = name.charAt(0).toUpperCase() + name.slice(1);

      function ListItem(data) {
        angular.extend(this, data);
      }

      ListItem.$$listName = name;
      ListItem.$$listRelativeUrl = "web/lists/getByTitle('" + name + "')";
      ListItem.$decorateResult = function(result, httpConfig) {
        if (!angular.isArray(result) && !(result instanceof ListItem)) {
          result = new ListItem(result);
        }
        if (angular.isUndefined(result.$resolved)) {
          result.$resolved = false;
        }
        result.$promise = $http(httpConfig).then(function(response) {
          var data = response.data;

          if (angular.isArray(result) && angular.isArray(data)) {
            angular.forEach(data, function(item) {
              result.push(new ListItem(item));
            });
          } else if (angular.isObject(result)) {
            if (angular.isArray(data)) {
              if (data.length === 1) {
                angular.extend(result, data[0]);
              } else {
                throw $spListMinErr('badresponse', 'Expected response to contain an array with one object but got {1}',
                  data.length);
              }
            } else if (angular.isObject(data)) {
              angular.extend(result, data);
            }
          } else {
            throw $spListMinErr('badresponse', 'Expected response to contain an {0} but got an {1}',
              angular.isArray(result) ? 'array' : 'object', angular.isArray(data) ? 'array' : 'object');
          }
          result.$resolved = true;

          return result;
        });

        return result;
      };
      ListItem.get = function(id, query) {
        if (angular.isUndefined(id)) {
          throw $spListMinErr('badargs', 'id is required.');
        }

        var result = {
          Id: id
        };
        var httpConfig = $spRest.buildHttpConfig(ListItem.$$listRelativeUrl, 'get', {id: id, query: query});

        return ListItem.$decorateResult(result, httpConfig);
      };
      ListItem.query = function(query, options) {
        var result = (angular.isDefined(options) && options.singleResult) ? {} : [];
        var httpConfig = $spRest.buildHttpConfig(ListItem.$$listRelativeUrl, 'query', {query: query});

        return ListItem.$decorateResult(result, httpConfig);
      };
      ListItem.create = function(item, query) {
        if (!(angular.isObject(item) && item instanceof ListItem)) {
          throw $spListMinErr('badargs', 'item must be a ListItem instance.');
        }
        var type = item.$settings.itemType;
        if (!type) {
          throw $spListMinErr('badargs', 'Cannot create an item without a valid type');
        }

        item.__metadata = {
          type: type
        };
        var httpConfig = $spRest.buildHttpConfig(ListItem.$$listRelativeUrl, 'create', {
          item: item,
          query: query
        });

        return ListItem.$decorateResult(item, httpConfig);
      };
      ListItem.update = function(item, options) {
        if (!(angular.isObject(item) && item instanceof ListItem)) {
          throw $spListMinErr('badargs', 'item must be a ListItem instance.');
        }

        options = angular.extend({}, options, {item: item});
        var httpConfig = $spRest.buildHttpConfig(ListItem.$$listRelativeUrl, 'update', options);

        return ListItem.$decorateResult(item, httpConfig);
      };
      ListItem.save = function(item, options) {
        if (angular.isUndefined(item.Id) || item === null) {
          return this.create(item);
        } else {
          return this.update(item, options);
        }
      };
      ListItem.delete = function(item) {
        if (!(angular.isObject(item) && item instanceof ListItem)) {
          throw $spListMinErr('badargs', 'item must be a ListItem instance.');
        }
        var httpConfig = $spRest.buildHttpConfig(ListItem.$$listRelativeUrl, 'delete', {item: item});

        return ListItem.$decorateResult(item, httpConfig);
      };

      ListItem.prototype = {
        $settings: {
          itemType: 'SP.Data.' + upcaseName + 'ListItem',
          readOnlyFields: angular.extend([
            'Author', 'Editor', 'Created', 'Modified'
          ], options.readOnlyFields)
        },
        $save: function(options) {
          return ListItem.save(this, options).$promise;
        },
        $delete: function() {
          return ListItem.delete(this).$promise;
        }
        // addNamedQuery: function(name, createParams) {
        //   var me = this;
        //   this.queries[name] = function() {
        //     var params = createParams.apply(me, arguments);
        //     return me.query(params);
        //   };
        //   return me;
        // }
      };

      return ListItem;
    }

    return listFactory;
  });
