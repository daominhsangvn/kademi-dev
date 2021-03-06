/**
 *
 * jquery.orgFinder.js
 * @version: 1.0.0
 *
 * Configuration:
 * @option {Array<Number>} initLatLng Initialized latitude and longitude of map
 * @option {Number} initZoomLevel Initialized zoom level of map
 * @option {String} initQuery Initialized search query
 * @option {String} googleAPIKey Google API key
 * @option {String} searchUrl Search URL. Must be link to signup page of a group or /organisations/ (if you use this plugin in Kademi admin console)
 * @option {String} template Template string for orgFinder. Form search must has 'org-finder-search' class and textbox must be named 'q'. Items list wrapper must has 'org-finder-list' class. Map div must has class 'org-finder-map'
 * @option {Function} onReady Callback will be called when orgFinder is ready. Arguments: 'formSearch', 'itemsWrapper', 'mapDiv'
 * @option {Function} onSelect Callback will be called when click on marker on map or item in org list panel. Arguments: 'orgData', 'item', 'marker', 'infoWindow'
 * @option {Function} onSearch Callback will be called when when search a keyword. Arguments: 'query'
 * @option {Function} renderItemContent Method for rendering content of an item in organization list. If you don't want to show this organization, just return null or empty. Arguments: 'orgData'
 * @option {Function} renderMarkerContent Method for rendering content for InfoWindow of a marker on Google Map. If you don't want to show this organization, just return null or empty. Arguments: 'orgData'
 */

(function ($) {
    $.fn.orgFinder = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('[jquery.orgFinder] Method ' + method + ' does not exist on jquery.orgFinder');
        }
    };

    // Version for jquery.orgFinder
    $.fn.orgFinder.version = '1.0.0';

    // Default configuration
    $.fn.orgFinder.DEFAULT = {
        initLatLng: [],
        initZoomLevel: 15,
        initQuery: null,
        googleAPIKey: null,
        searchUrl: null,
        template:
        '<form role="form" class="form-horizontal form-search org-finder-search" action="" style="margin-bottom: 15px;">' +
        '    <div class="input-group input-group-lg">' +
        '        <input type="text" name="q" class="form-control" placeholder="Enter keyword to search..." value="" />' +
        '        <span class="input-group-btn">' +
        '            <button class="btn btn-default" type="submit">Search</button>' +
        '        </span>' +
        '    </div>' +
        '</form>' +
        '<div class="row" style="margin-bottom: 40px;">' +
        '    <div class="col-md-4">' +
        '        <div class="panel panel-default">' +
        '            <div class="panel-heading"><i class="fa fa-list"></i> List Organisations</div>' +
        '            <div class="list-group org-finder-list" style="overflow-y: auto;"></div>' +
        '        </div>' +
        '    </div>' +
        '    <div class="col-md-8">' +
        '        <div class="embed-responsive embed-responsive-16by9">' +
        '            <div class="embed-responsive-item org-finder-map"></div>' +
        '        </div>' +
        '    </div>' +
        '</div>'
        ,
        onReady: function (formSearch, itemsWrapper, mapDiv) {
        },
        onSelect: function (orgData, item, marker, infoWindow) {
        },
        onSearch: function (query) {
        },
        renderItemContent: function (orgData) {
            var itemContent = '';
            itemContent += '<h4 class="list-group-item-heading">' + (orgData.orgTypeDisplayName || orgData.title ) + '</h4>';

            if (orgData.phone) {
                itemContent += '<p class="list-group-item-text"><strong>Phone:</strong> ' + orgData.phone + '</p>';
            }
            if (orgData.email) {
                itemContent += '<p class=list-group-item-text"><strong>Email:</strong> <a href="mailto:' + orgData.email + '">' + orgData.email + '</a></p>';
            }
            if (orgData.address) {
                itemContent += '<p class="list-group-item-text"><strong>Address:</strong> ' + orgData.address + '</p>';
            }
            if (orgData.addressLine2) {
                itemContent += '<p class=list-group-item-text"><strong>Address Line 2:</strong> ' + orgData.addressLine2 + '</p>';
            }
            if (orgData.addressState) {
                itemContent += '<p class="list-group-item-text"><strong>State:</strong> ' + orgData.addressState + '</p>';
            }
            if (orgData.country) {
                itemContent += '<p class="list-group-item-text"><strong>Country:</strong> ' + orgData.country + '</p>';
            }
            if (orgData.postcode) {
                itemContent += '<p class="list-group-item-text"><strong>Postcode:</strong> ' + orgData.postcode + '</p>';
            }

            return '<div class="list-group-item">' + itemContent + '</div>';
        },
        renderMarkerContent: function (orgData) {
            var markerContent = '';
            markerContent += '<h1>' + (orgData.orgTypeDisplayName || orgData.title ) + '</h1>';

            if (orgData.phone) {
                markerContent += '<div><strong>Phone:</strong> ' + orgData.phone + '</div>';
            }
            if (orgData.email) {
                markerContent += '<div><strong>Email:</strong> <a href="mailto:' + orgData.email + '">' + orgData.email + '</a></div>';
            }
            if (orgData.address) {
                markerContent += '<div><strong>Address:</strong> ' + orgData.address + '</div>';
            }
            if (orgData.addressLine2) {
                markerContent += '<div><strong>Address Line 2:</strong> ' + orgData.addressLine2 + '</div>';
            }
            if (orgData.addressState) {
                markerContent += '<div><strong>State:</strong> ' + orgData.addressState + '</div>';
            }
            if (orgData.country) {
                markerContent += '<div><strong>Country:</strong> ' + orgData.country + '</div>';
            }
            if (orgData.postcode) {
                markerContent += '<div><strong>Postcode:</strong> ' + orgData.postcode + '</div>';
            }

            return '<div>' + markerContent + '</div>';
        }
    };

    var SEARCH_SELECTOR = '.org-finder-search';
    var LIST_SELECTOR = '.org-finder-list';
    var MAP_SELECTOR = '.org-finder-map';

    function Finder(container, options) {
        this.options = options;
        this.container = container;
        this.init();
    }

    Finder.prototype = {
        map: null,
        markers: [],
        infoWindows: [],
        listItems: [],
        activeInfoWidow: null,
        activeListItem: null,

        init: function () {
            var self = this;
            var options = self.options;
            var container = self.container;

            container.html(options.template);
            self.formSearch = container.find(SEARCH_SELECTOR);
            self.itemsWrapper = container.find(LIST_SELECTOR);
            self.mapDiv = container.find(MAP_SELECTOR);

            self.initMap();
        },

        initMap: function () {
            flog('[jquery.orgFinder] initMap');

            var self = this;
            var options = this.options;
            var functionName = 'init' + (new Date()).getTime();
            var googleMapCallback = '$.fn.orgFinder.' + functionName;

            $.fn.orgFinder[functionName] = function () {
                var mapOptions = {};
                if (options.initLatLng.length === 2) {
                    mapOptions.center = {
                        lat: options.initLatLng[0],
                        lng: options.initLatLng[1]
                    };
                }

                if (options.initZoomLevel) {
                    mapOptions.zoom = options.initZoomLevel;
                }

                self.map = new google.maps.Map(self.mapDiv.get(0), mapOptions);
                self.initFormSearch();

                if (typeof options.onReady === 'function') {
                    options.onReady.call(self, self.formSearch, self.itemsWrapper, self.mapDiv);
                }
            };

            if (window.google && window.google.maps) {
                flog('[jquery.orgFinder] Google Map Api is already in documentation');
                $.fn.orgFinder[functionName].call(this);
            } else {
                var gmapApiUrl = 'https://maps.googleapis.com/maps/api/js?key=' + self.options.googleAPIKey + '&libraries=places&callback=' + googleMapCallback;
                flog('[jquery.orgFinder] Load Google Map Api from "' + gmapApiUrl + '"');
                $.getScript(gmapApiUrl);
            }
        },

        initFormSearch: function () {
            flog('[jquery.orgFinder] initFormSearch');

            var self = this;
            var formSearch = self.formSearch;
            var txtQ = formSearch.find('[name=q]');
            var btn = formSearch.find(':button');
            var initQuery = self.options.initQuery;
            var lastQuery = null;

            if (initQuery !== null && initQuery !== undefined && initQuery.trim() !== '') {
                txtQ.val(initQuery);
            }

            var eventHandler = function () {
                var query = (txtQ.val() || '').trim();
                query = query === '' ? ' ' : query;
                flog('[jquery.orgFinder] Query: "' + query + '", last query: "' + lastQuery + '"');

                if (query !== lastQuery) {
                    self.clear();
                    self.doSearch(query);
                } else {
                    flog('[jquery.orgFinder] Query is already searched. Do nothing');
                }
                lastQuery = query;
            };

            if (formSearch.is('form')) {
                formSearch.on('submit', function (e) {
                    e.preventDefault();

                    eventHandler();
                }).trigger('submit');
            } else {
                btn.on('click', function (e) {
                    e.preventDefault();

                    eventHandler();
                }).trigger('click');

                txtQ.on('keydown', function (e) {
                    if (e.keyCode === 13) {
                        e.preventDefault();
                        eventHandler();
                    }
                });
            }
        },

        clear: function () {
            flog('[jquery.orgFinder] clear');

            if (this.activeInfoWidow) {
                this.activeInfoWidow.close();
            }

            for (var i = 0; i < this.markers.length; i++) {
                this.markers[i].setMap(null);
                delete this.markers[i];
                delete this.infoWindows[i];
                delete this.listItems[i];
            }

            this.markers = [];
            this.infoWindows = [];
            this.listItems = [];
            this.activeInfoWidow = null;
            this.activeListItem = null;
            this.itemsWrapper.html('');
        },

        doSearch: function (query) {
            flog('[jquery.orgFinder] doSearch', query);

            var self = this;
            var options = self.options;

            if (typeof options.onSearch === 'function') {
                options.onSearch.call(self, query);
            }

            var searchUrl = (options.searchUrl || '').trim();
            if (searchUrl.length === 0) {
                $.error('[jquery.orgFinder] Search Url is empty!');
            }

            $.ajax({
                url: options.searchUrl,
                dataType: 'json',
                type: 'get',
                data: {
                    jsonQuery: query
                },
                success: function (resp) {
                    flog('[jquery.orgFinder] Success in getting data', resp);

                    self.clear();

                    if (resp && resp.status && resp.data && resp.data[0]) {
                        self.generateData(resp.data);
                    } else {
                        self.itemsWrapper.html('<div class="list-group-item">No result</div>');
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    flog('[jquery.orgFinder] Error when getting data', jqXHR, textStatus, errorThrown);
                }
            });
        },

        generateData: function (data) {
            flog('[jquery.orgFinder] doSearch', data);

            var self = this;
            var options = self.options;
            var map = self.map;
            var lats = [];
            var lngs = [];

            for (var i = 0; i < data.length; i++) {
                self.createDataItem(data[i], i);
                lats.push(data[i].lat);
                lngs.push(data[i].lng);
            }

            if (data.length === 1) {
                map.setCenter(new google.maps.LatLng(data[0].lat, data[0].lng));
                map.setZoom(options.initZoomLevel);
            } else {
                // Calculate center and zoom level for map when show all markers
                var minLat = Math.min.apply(this, lats);
                var maxLat = Math.max.apply(this, lats);
                var minLng = Math.min.apply(this, lngs);
                var maxLng = Math.max.apply(this, lngs);

                map.fitBounds(new google.maps.LatLngBounds(
                    new google.maps.LatLng(minLat, minLng),
                    new google.maps.LatLng(maxLat, maxLng)
                ));
            }
        },

        createDataItem: function (markerData, index) {
            flog('[jquery.orgFinder] createDataItem', markerData, index);

            var self = this;
            var options = self.options;
            var map = self.map;
            var itemsWrapper = self.itemsWrapper;
            var latlng = new google.maps.LatLng(markerData.lat, markerData.lng);
            var marker = new google.maps.Marker({
                position: latlng,
                animation: google.maps.Animation.DROP,
                title: markerData.orgTypeDisplayName || markerData.title
            });
            marker.setMap(map);

            if (typeof options.renderItemContent !== 'function') {
                $.error('[jquery.orgFinder] renderItemContent is not function. Please correct it!');
            }

            if (typeof options.renderMarkerContent !== 'function') {
                $.error('[jquery.orgFinder] renderMarkerContent is not function. Please correct it!');
            }

            var itemContent = options.renderItemContent(markerData) || '';
            var markerContent = options.renderMarkerContent(markerData) || '';

            if (itemContent.length === 0 || markerContent.length === 0) {
                flog('[jquery.orgFinder] Item content or Marker content is empty. Skipped on creating!');
            } else {
                flog('[jquery.orgFinder] Creating marker and item');

                var infoWindow = new google.maps.InfoWindow({
                    content: markerContent
                });
                flog('[jquery.orgFinder] Info window', infoWindow);

                var item = $(itemContent);
                itemsWrapper.append(item);
                flog('[jquery.orgFinder] Item', item);

                var clickEventHandler = function (doScroll) {
                    if (self.activeInfoWidow) {
                        self.activeInfoWidow.close();
                    }
                    itemsWrapper.find('.active').removeClass('active');
                    infoWindow.open(map, marker);
                    self.activeInfoWidow = infoWindow;
                    item.addClass('active');

                    if (doScroll) {
                        itemsWrapper.scrollTo(item);
                    }

                    if (typeof options.onSelect === 'function') {
                        options.onSelect.call(self, markerData, item, marker, infoWindow);
                    }
                };

                marker.addListener('click', function () {
                    flog('[jquery.orgFinder] Clicked on marker', marker);

                    clickEventHandler(true);
                });

                item.on('click', function (e) {
                    e.preventDefault();
                    flog('[jquery.orgFinder] Clicked on item', item);

                    clickEventHandler(false);
                });

                self.markers.push(marker);
                self.infoWindows.push(infoWindow);
                self.listItems.push(item);
            }
        }
    };

    var methods = {
        init: function (options) {
            options = $.extend({}, $.fn.orgFinder.DEFAULT, options);

            if (options.googleAPIKey === null || options.googleAPIKey === undefined || options.googleAPIKey.trim() === '') {
                $.error('[jquery.orgFinder] Google API Key is empty!');
            }

            $(this).each(function () {
                var container = $(this);
                if (!container.data('orgFinder')) {
                    var finder = new Finder(container, options);
                    container.data('orgFinder', finder);
                }
            });
        }
    };

})(jQuery);
