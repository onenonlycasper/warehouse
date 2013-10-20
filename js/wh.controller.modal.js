(function($) {

    angular.module('mControllerModal', ['mService'])

        .controller('cModalActions', ['$rootScope', '$scope', '$compile', 'sModal', function($root, $scope, $compile, modal) {

            var fnShowModal = function() {
                    modal.open($($compile($('<div ng-include="oModal.template"></div>').attr('ng-controller', $root.oModal.controller)[0])($root)), {
                        cbAfterClose: function() {
                            delete $root.oModal;
                        }
                    });
                },

                oActions = {
                    fnDelete: function(action, table, id) {
                        $root.oModal = {
                            action: action,
                            template: '/page/modal-delete.html',
                            controller: 'cModalDelete',
                            table: table,
                            id: id
                        };
                        fnShowModal();
                    },

                    fnEdit: function(action, table, id) {
                        $root.oModal = {
                            action: action,
                            template: '/page/modal-edit-' + table.toLowerCase() + '.html',
                            controller: 'cModalEdit' + table,
                            table: table,
                            id: id
                        };
                        fnShowModal();
                    },

                    fnShow: function(action, table, id) {
                        $root.oModal = {
                            action: action,
                            template: '/page/modal-show-' + table.toLowerCase() + '.html',
                            controller: 'cModalShow' + table,
                            table: table,
                            id: id
                        };
                        fnShowModal();
                    }
                };

            oActions.fnAdd = oActions.fnEdit;

            $scope.fnModalAction = function(ev, action, table, id) {
                action = _.find(['Delete', 'Edit', 'Add', 'Show'], function(el) {
                    return el.toLowerCase() === action.toLowerCase();
                });
                if (!$(ev.target).attr('disabled') && action) {
                    oActions['fn' + action](action, table, id);
                }
                ev.stopPropagation();
            };
        }])



        .controller('cModalDelete', ['$rootScope', '$scope', 'sDatabase', 'sUpdateUI', 'sModal', function($root, $scope, db, upd, modal) {
            var oData = {
                Card: {
                    text: 'Are you sure that you want to delete this card?',
                    fnDelete: function(tr, id, cb) {
                        db.sql(tr, 'DELETE FROM Card WHERE id = ' + id + ';').done(cb || $.noop);
                    }
                },
                Template: {
                    text: 'Are you sure that you want to delete this template? <br>All associated cards will be deleted.',
                    fnDelete: function(tr, id, cb) {
                        db.sql(tr, [
                            'DELETE FROM Data WHERE id_field IN (SELECT id FROM Field WHERE id_template = ' + id + ');',
                            'DELETE FROM Field WHERE id_template = ' + id + ';',
                            'DELETE FROM Card WHERE id_template = ' + id + ';',
                            'DELETE FROM Template WHERE id = ' + id + ';'
                        ]).done(cb || $.noop);
                    }
                },
                Tag: {
                    text: 'Are you sure that you want to delete this tag?',
                    fnDelete: function(tr, id, cb) {
                        db.sql(tr, [
                            'DELETE FROM Card_Tag WHERE id_tag = ' + id + ';',
                            'DELETE FROM Tag WHERE id = ' + id + ';'
                        ]).done(cb || $.noop);
                    }
                }
            };

            $.extend($scope, {
                el: null,
                text: oData[$root.oModal.table].text,

                fnOk: function() {
                    db.connection.transaction(function(tr) {
                        oData[$root.oModal.table].fnDelete(tr, $scope.el.id, function() {
                            modal.close();
                            upd();
                        });
                    });
                },

                fnCancel: function() {
                    modal.close();
                }
            });

            db.connection.transaction(function(tr) {
                db.sql(tr, 'SELECT * From ' + $root.oModal.table + ' WHERE id = ' + $root.oModal.id + ';').done(function(result) {
                    $scope.el = db.toArray(result)[0];
                });
            });
        }])



        .controller('cModalEditTag', ['$rootScope', '$scope', 'sDatabase', 'sUpdateUI', 'sModal', function($root, $scope, db, upd, modal) {
            var add = $root.oModal.action === 'Add';

            $.extend($scope, {
                el: add ? { name: '', desc: '' }: null,

                fnOk: function(ev) {
                    if (!ev.invalid) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, add ? {
                                query: 'INSERT INTO Tag (name, desc) VALUES (?, ?);',
                                data: [$scope.el.name, $scope.el.desc]
                            } : {
                                query: 'UPDATE Tag SET name = ?, desc = ? WHERE id = ?;',
                                data: [$scope.el.name, $scope.el.desc, $scope.el.id]
                            }).done(function() {
                                modal.close();
                                upd();
                            });
                        });
                    }
                },

                fnCancel: function() {
                    modal.close();
                }
            });

            if (!add) {
                db.connection.transaction(function(tr) {
                    db.sql(tr, 'SELECT * FROM Tag WHERE id = ' + $root.oModal.id + ';').done(function(rT) {
                        $scope.el = angular.copy(db.toArray(rT)[0]);
                        $scope.$digest();
                    });
                });
            }
        }])



        .controller('cModalEditTemplate', ['$rootScope', '$scope', 'sDatabase', 'sUpdateUI', 'sModal', function($root, $scope, db, upd, modal) {
            var add = $root.oModal.action === 'Add',
                aStartFields = [],

                fnReorder = function(array) {
                    _.each(array, function(el, index) {
                        el.order = index + 1;
                    });
                },

                fnSaveFields = function(cb) {
                    fnReorder($scope.aFields);

                    var aDelete = _.difference(aStartFields, $scope.aFields),
                        aInsert = _.difference($scope.aFields, aStartFields),
                        aUpdate = _.intersection(aStartFields, $scope.aFields),

                        aDeleteSql = [
                            'DELETE FROM Data WHERE id_field IN (' + _.pluck(aDelete, 'id').join(', ') + ');',
                            'DELETE FROM Field WHERE id IN (' + _.pluck(aDelete, 'id').join(', ') + ');'
                        ],
                        aInsertSql = _.map(aInsert, function(eF) {
                            return {
                                query: 'INSERT INTO Field (name, extra, "order", id_type, id_template) VALUES (?, ?, ?, ?, ?);',
                                data: [ eF.name, eF.extra, eF.order, eF.id_type, $scope.el.id ]
                            };
                        }),
                        aUpdateSql = _.map(aUpdate, function(eF) {
                            return {
                                query: 'UPDATE Field SET name = ?, extra = ?, "order" = ?, id_type = ?, id_template = ? WHERE id = ?;',
                                data: [ eF.name, eF.extra, eF.order, eF.id_type, $scope.el.id, eF.id ]
                            };
                        });

                    db.connection.transaction(function(tr) {
                        db.sql(tr, aDeleteSql.concat(aInsertSql, aUpdateSql)).done(function() {
                            (cb || $.noop)();
                        });
                    });
                };

            $.extend($scope, {
                el: null,

                fnOk: function(ev) {
                    if (!ev.invalid) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, add ? {
                                query: 'INSERT INTO Template (name, desc) VALUES (?, ?);',
                                data: [$scope.el.name, $scope.el.desc]
                            } : {
                                query: 'UPDATE Template SET name = ?, desc = ? WHERE id = ?;',
                                data: [$scope.el.name, $scope.el.desc, $scope.el.id]
                            }).done(function(rT) {
                                if (add) {
                                    $scope.el.id = rT.insertId;
                                }
                                fnSaveFields(function() {
                                    modal.close();
                                    upd();
                                });
                            });
                        });
                    }
                },

                fnCancel: function() {
                    modal.close();
                },

                fnAdd: function() {
                    $scope.aFields.push({
                        name: '',
                        extra: '',
                        id_type: 1
                    });
                },

                fnDelete: function(ev, index) {
                    if (!$(ev.target).attr('disabled')) {
                        $scope.aFields.splice(index, 1);
                    }
                },

                fnUp: function(ev, index) {
                    if (!$(ev.target).attr('disabled')) {
                        $scope.aFields.splice(index - 1, 0, $scope.aFields.splice(index, 1)[0]);
                    }
                },

                fnDown: function(ev, index) {
                    if (!$(ev.target).attr('disabled')) {
                        $scope.aFields.splice(index + 1, 0, $scope.aFields.splice(index, 1)[0]);
                    }
                }
            });

            $scope.oFieldTemplate = {
                1: '<input class="m-required" type="text" d-style-text ng-model="i.name" placeholder="Name"/>',
                2: '<input class="m-required" type="text" d-style-text ng-model="i.name" placeholder="Name"/>',
                3: '<input class="m-required" type="text" d-style-text ng-model="i.name" placeholder="Name"/>',
                4: '<input class="m-required" type="text" d-style-text ng-model="i.name" placeholder="Name"/>',
                5: '<div class="m-wrap-2">\
                        <input class="m-required" type="text" d-style-text ng-model="i.name" placeholder="Name"/>\
                        <input type="text" d-style-text ng-model="i.extra" placeholder="Format date (example: d MM yy, DD)"/>\
                    </div>',
                6: '<div class="m-wrap-2">\
                        <input class="m-required" type="text" d-style-text ng-model="i.name" placeholder="Name"/>\
                        <input class="m-required" type="text" d-style-text ng-model="i.extra" placeholder="List of comma separated options"/>\
                    </div>'
            };

            if (add) {
                db.connection.transaction(function(tr) {
                    db.sql(tr, 'SELECT * FROM Type;').done(function(rT) {
                        $scope.el = { name: '', desc: '' };
                        $scope.aFields = [];
                        $scope.fnAdd();
                        $scope.aTypes = db.toArray(rT);
                        $scope.$digest();
                    });
                });
            } else {
                db.connection.transaction(function(tr) {
                    db.sql(tr, [
                        'SELECT * FROM Template WHERE id = ' + $root.oModal.id + ';',
                        'SELECT * FROM Field WHERE id_template = ' + $root.oModal.id + ' ORDER BY "order";',
                        'SELECT * FROM Type;'
                    ]).done(function(r0, r1, r2) {
                        $scope.el = angular.copy(db.toArray(r0)[0]);
                        $scope.aFields = angular.copy(db.toArray(r1));
                        aStartFields = $scope.aFields.concat([]);
                        $scope.aTypes = db.toArray(r2);
                        $scope.$digest();
                    });
                });
            }
        }])



        .controller('cModalEditCard', ['$rootScope', '$scope', 'sDatabase', 'sUpdateUI', 'sModal', function($root, $scope, db, upd, modal) {
            var add = $root.oModal.action === 'Add',

                fnLoadFields = function(cb) {
                    if ($scope.el !== undefined && $scope.el.id_template !== null) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, 'SELECT * FROM Field WHERE id_template = ' + $scope.el.id_template + ';').done(function(rF) {
                                $scope.aFields = angular.copy(db.toArray(rF));
                                (add || _.size($scope.oData) ? fnCreateData : fnLoadData)(function() {
                                    (cb || $.noop)();
                                });
                            });
                        });
                    }
                },

                fnCreateData = function(cb) {
                    var idT = $scope.el.id_template;
                    if ($scope.oData[idT] === undefined) {
                        $scope.oData[idT] = {};
                        _.each($scope.aFields, function(eF) {
                            $scope.oData[idT][eF.id] = '';
                            (cb || $.noop)();
                        });
                    } else {
                        (cb || $.noop)();
                    }
                },

                fnLoadData = function(cb) {
                    var idT = $scope.el.id_template;
                    if ($scope.oData[idT] === undefined) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, 'SELECT D.* FROM Data AS D, Field AS F WHERE D.id_card = ' + $scope.el.id + ' AND D.id_field = F.id AND F.id_template = ' + idT + ' ORDER BY F."order";').done(function(rD) {
                                $scope.oData[idT] = {};
                                _.each(angular.copy(db.toArray(rD)), function(eD) {
                                    $scope.oData[idT][eD.id_field] = eD.value;
                                });
                                var aMissed = _.difference(_.pluck($scope.aFields, 'id'), _.map($scope.oData[idT], function(el, index) {
                                    return parseInt(index);
                                }));
                                _.each(aMissed, function(id) {
                                    $scope.oData[idT][id] = null;
                                });
                                (cb || $.noop)();
                            });
                        });
                    } else {
                        (cb || $.noop)();
                    }
                },

                fnSaveData = function(cb) {
                    var aInsertSql = _.map($scope.oData[$scope.el.id_template], function(value, idField) {
                        return {
                            query: 'INSERT INTO Data (id_card, id_field, value) VALUES (?, ?, ?);',
                            data: [$scope.el.id, idField, value]
                        };
                    });

                    db.connection.transaction(function(tr) {
                        db.sql(tr, ['DELETE FROM Data WHERE id_card = ' + $scope.el.id + ';'].concat(aInsertSql)).done(function() {
                            (cb || $.noop)();
                        });
                    });
                },

                fnSaveTags = function(cb) {
                    var aInsertSql = _.map($scope.el.aTags, function(idTag) {
                        return {
                            query: 'INSERT INTO Card_Tag (id_card, id_tag) VALUES (?, ?);',
                            data: [$scope.el.id, idTag]
                        };
                    });

                    db.connection.transaction(function(tr) {
                        db.sql(tr, ['DELETE FROM Card_Tag WHERE id_card = ' + $scope.el.id + ';'].concat(aInsertSql)).done(function() {
                            (cb || $.noop)();
                        });
                    });
                };

            $.extend($scope, {
                fnOk: function(ev) {
                    if (!ev.invalid) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, add ? {
                                query: 'INSERT INTO Card (name, desc, id_template) VALUES (?, ?, ?);',
                                data: [$scope.el.name, $scope.el.desc, $scope.el.id_template]
                            } : {
                                query: 'UPDATE Card SET name = ?, desc = ?, id_template = ? WHERE id = ?;',
                                data: [$scope.el.name, $scope.el.desc, $scope.el.id_template, $scope.el.id]
                            }).done(function(rC) {
                                if (add) {
                                    $scope.el.id = rC.insertId;
                                }
                                fnSaveTags(function() {
                                    fnSaveData(function() {
                                        modal.close();
                                        upd();
                                    });
                                });
                            });
                        });
                    }
                },

                fnCancel: function() {
                    modal.close();
                }
            });

            $scope.oFieldTemplate = {
                1: '<input type="text" d-style-text ng-model="oData[el.id_template][i.id]">',
                2: '<textarea d-style-textarea ng-model="oData[el.id_template][i.id]"></textarea>',
                3: '<input type="text" d-style-text ng-model="oData[el.id_template][i.id]">',
                4: '<input type="text" d-style-text ng-model="oData[el.id_template][i.id]">',
                5: '<input type="text" d-style-date="i.extra" ng-model="oData[el.id_template][i.id]">',
                6: '<select class="m-required" ng-model="oData[el.id_template][i.id]" ng-init="oTemp[i.id] = (i.extra|fSplit:\' *, *\')" d-style-select="oTemp[i.id]">\
                        <option ng-repeat="j in oTemp[i.id]" value="{{ j }}">{{ j }}</option>\
                    </select>'
            };

            if (add) {
                db.connection.transaction(function(tr) {
                    db.sql(tr, [
                        'SELECT * FROM Template ORDER BY name;',
                        'SELECT * FROM Tag WHERE id <> 0 ORDER BY name;',
                        'SELECT * FROM Type'
                    ]).done(function(r0, r1, r2) {
                        $scope.el = { name: '', desc: '', id_template: null, aTags: [] };
                        $scope.aTemplates = db.toArray(r0);
                        $scope.aTags = db.toArray(r1);
                        $scope.oTypes = db.toArray(r2);
                        $scope.oTypes = _.object(_.pluck($scope.oTypes, 'id'), $scope.oTypes);
                        $scope.oData = {};
                        $scope.oTemp = {};
                        $scope.$digest();
                    });
                });
            } else {
                db.connection.transaction(function(tr) {
                    db.sql(tr, [
                        'SELECT * FROM Card WHERE id = ' + $root.oModal.id + ';',
                        'SELECT T.id FROM Card_Tag AS CT, Tag AS T WHERE T.id = CT.id_tag AND CT.id_card = ' + $root.oModal.id + ' ORDER BY T.name;',
                        'SELECT * FROM Template ORDER BY name;',
                        'SELECT * FROM Tag WHERE id <> 0 ORDER BY name;',
                        'SELECT * FROM Type'
                    ]).done(function(r0, r1, r2, r3, r4) {
                        $scope.el = angular.copy(db.toArray(r0)[0]);
                        $scope.el.aTags = _.pluck(db.toArray(r1), 'id');
                        $scope.aTemplates = db.toArray(r2);
                        $scope.aTags = db.toArray(r3);
                        $scope.oTypes = db.toArray(r4);
                        $scope.oTypes = _.object(_.pluck($scope.oTypes, 'id'), $scope.oTypes);
                        $scope.oData = {};
                        $scope.oTemp = {};
                        $scope.$digest();
                    });
                });
            }

            $scope.$watch('el.id_template', function() {
                fnLoadFields(function() {
                    $scope.$digest();
                });
            });
        }])



        .controller('cModalShowCard', ['$rootScope', '$scope', 'sDatabase', 'sModal', function($root, $scope, db, modal) {
            $scope.fnClose = function() {
                modal.close();
            };

            $scope.oFieldTemplate = {
                1: '<input type="text" d-style-text d-click-select value="{{ i.value }}" readonly>',
                2: '<div class="value m-text" d-click-select ng-bind-html-unsafe="i.value"></div>',
                3: '<div class="value m-url" d-click-select><a href="{{ \'mailto:\'|fMatch:i.value:\'@\' }}{{ i.value }}">{{ i.value }}</a></div>',
                4: '<div class="value m-password" d-click-select><span class="hidden">{{ i.value }}</span><span class="visible">{{ i.value|fAsterisk }}</span></div>',
                5: '<input type="text" d-style-text d-click-select value="{{ i.value }}" readonly>',
                6: '<input type="text" d-style-text d-click-select value="{{ i.value }}" readonly>'
            };

            db.connection.transaction(function(tr) {
                db.sql(tr, [
                    'SELECT C.*, T.name AS name_template FROM Card AS C, Template AS T WHERE T.id = C.id_template AND C.id = ' + $root.oModal.id + ';',
                    'SELECT T.name FROM Card_Tag AS CT, Tag AS T WHERE T.id = CT.id_tag AND CT.id_card = ' + $root.oModal.id + ' ORDER BY T.name;',
                    'SELECT F.name, F.id_type, D.value FROM Data AS D, Field AS F WHERE D.id_card = ' + $root.oModal.id + ' AND D.id_field = F.id ORDER BY F."order";'
                ]).done(function(r0, r1, r2) {
                    $scope.el = db.toArray(r0)[0];
                    $scope.aTags = _.pluck(db.toArray(r1), 'name');
                    $scope.aData = angular.copy(db.toArray(r2));
                    _.each($scope.aData, function(el) {
                        if (el.id_type === 2) {
                            el.value = el.value.replace(/\n/g, '<br>');
                        } else {
                            el.value = el.value.replace(/\n/g, '');
                        }
                    });
                    $scope.$digest();
                });
            });
        }]);
}(jQuery));