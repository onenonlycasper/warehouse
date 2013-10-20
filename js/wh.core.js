(function($) {

    angular.module('warehouse', ['mService', 'mView', 'mControllerList', 'mControllerModal', 'mControllerDatabase'])

        .config(['$provide', '$routeProvider', function($provide, $route) {
            var aMainMenu = [{
                name: 'Cards',
                url: '',
                template: '/page/cards.html'
            }, {
                name: 'Templates',
                url: '/templates/',
                template: '/page/templates.html'
            }, {
                name: 'Tags',
                url: '/tags/',
                template: '/page/tags.html'
            }];

            $provide.value('vMainMenu', aMainMenu);
            $provide.value('vFXDuration', 300);

            _.each(aMainMenu, function(page) {
                $route.when(page.url, { templateUrl: page.template });
            });
            $route.when('/index.html', { templateUrl: '/page/cards.html' });
        }])



        .run(['$rootScope', '$location', 'vMainMenu', 'sDatabase', 'sVersion', function($root, $loc, menu, db, version) {

            $root.ready = 0;
            $root.aMainMenu = menu;

            $root.$on('$routeChangeSuccess', function() {
                $root.page = Math.max(0, (function() {
                    return _.indexOf(menu, _.find(menu, function(page) {
                        return (new RegExp('^' + page.url + '($|[^/])')).test($loc.path());
                    }));
                }()));
            });

            $.when(db.ready, version.ready).done(function() {
                $root.ready = 1;
                $root.$digest();
            });
        }]);

}(jQuery));



jQuery(function($) {

    var jBody = $('body'),
        wScroll = -jBody.css({overflow: 'scroll'}).width() + jBody.css({overflow: 'hidden'}).width(),
        fnResize = function() {
            $('#c-content-wrapper').width(window.innerWidth - wScroll);
        };

    jBody.css({overflow: ''});
    fnResize();
    $(window).resize(fnResize);
});