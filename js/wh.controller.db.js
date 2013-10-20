(function($) {

    angular.module('mControllerDatabase', ['mService'])

        .controller('cModalDatabase', ['$rootScope', '$scope', '$compile', 'sModal', 'sFile', function($root, $scope, $compile, modal, file) {

            var fnShowModal = function() {
                    modal.open($($compile($('<div ng-include="oModal.template"></div>').attr('ng-controller', $root.oModal.controller)[0])($root)), {
                        cbAfterClose: function() {
                            delete $root.oModal;
                        }
                    });
                },

                fnAction = {
                    clear: function() {
                        $root.oModal = {
                            template: '/page/modal-db-clear.html',
                            controller: 'cModalDatabaseClear'
                        };
                        fnShowModal();
                    },
                    export: file.export,
                    import: file.import
                };

            $scope.fnModalAction = function(ev, action) {
                action = _.find(['Clear', 'Export', 'Import'], function(el) {
                    return el.toLowerCase() === action.toLowerCase();
                });
                if (action) {
                    fnAction[action.toLowerCase()]();
                }
                ev.stopPropagation();
            };
        }])



        .controller('cModalDatabaseClear', ['$scope', 'sDatabase', 'sUpdateUI', 'sModal', function($scope, db, upd, modal) {
            $.extend($scope, {
                fnOk: function() {
                    db.reset(function() {
                        modal.close();
                        upd();
                    });
                },

                fnCancel: function() {
                    modal.close();
                }
            });
        }]);

}(jQuery));