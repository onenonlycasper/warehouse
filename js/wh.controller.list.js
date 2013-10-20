(function($) {

    angular.module('mControllerList', ['mService'])

        .controller('cCardFilter', ['$rootScope', '$scope', 'sDatabase', function($root, $scope, db) {
            var fnUpdate = function() {
                    if ($root.ready) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, [
                                'SELECT * FROM Template ORDER BY name ASC;',
                                'SELECT * FROM Tag WHERE id <> 0 ORDER BY name ASC;',
                                'SELECT * FROM Tag WHERE id = 0;'
                            ]).done(function(r0, r1, r2) {
                                $scope.aTemplates = db.toArray(r0);
                                $scope.aTags = db.toArray(r1).concat(db.toArray(r2));
                                $scope.$digest();
                            });
                        });
                    }
                },

                oBlank = {
                    card: '',
                    aTemplates: [],
                    aTags: []
                };

            $.extend($scope, {
                oData: angular.copy(oBlank),

                fnApply: function() {
                    $root.oFilter = angular.copy($scope.oData);
                    $root.oFilter.card = $.trim($root.oFilter.card);
                },

                fnCancel: function() {
                    $root.oFilter = angular.copy(oBlank);
                },

                fnKeyUp: function(e) {
                    if (e.keyCode === 27) {
                        $scope.fnCancel();
                    }
                }
            });

            $root.oFilter = angular.copy($scope.oData);

            $root.$watch('ready', fnUpdate);
            $root.$watch('sUpdateUI', fnUpdate);
        }])



        .controller('cCardList', ['$rootScope', '$scope', 'sDatabase', function($root, $scope, db) {
            var fnUpdate = function() {
                if ($root.ready) {

                    var f = $root.oFilter,
                        sql = {
                            select: 'SELECT C.*',
                            from: ' FROM Card AS C',
                            where: '',
                            group: '',
                            having: '',
                            order: ' ORDER BY C.name ASC;'
                        };

                    if (f.card !== '') {
                        var oReplace = {
                                '"': '""',
                                '/': '//',
                                '_': '/_',
                                '%': '/%'
                            },
                            str = f.card.replace(new RegExp(_.keys(oReplace).join('|'), 'g'), function(match) {
                                return oReplace[match];
                            });
                        sql.where += (sql.where === '' ? ' WHERE' : ' AND') + ' (C.name LIKE "%' + str + '%"ESCAPE"/" OR C.desc LIKE "%' + str + '%"ESCAPE"/")';
                    }

                    if (f.aTemplates.length) {
                        sql.from += ', Template AS T';
                        sql.where += (sql.where === '' ? ' WHERE' : ' AND') + ' C.id_template = T.id AND T.id IN (' + f.aTemplates.join(', ') + ')';
                    }

                    if (f.aTags.length) {
                        if (f.aTags.length === 1 && f.aTags[0] === '0') {
                            sql.where += (sql.where === '' ? ' WHERE' : ' AND') + ' C.id NOT IN (SELECT DISTINCT id_card FROM Card_Tag)';
                        } else {
                            sql.from += ', Card_Tag AS CT';
                            sql.where += (sql.where === '' ? ' WHERE' : ' AND') + ' (C.id = CT.id_card AND CT.id_tag IN (' + f.aTags.join(', ') + '))';
                            sql.group = ' GROUP BY C.id';
                            sql.having = ' HAVING COUNT(CT.id) = ' + f.aTags.length;
                        }
                    }

                    db.connection.transaction(function(tr) {                                                                                // формирование списка всех допустимых записей
                        db.sql(tr, sql.select + sql.from + sql.where + sql.group + sql.having + sql.order).done(function(rC) {
                            var cards = db.toArray(rC);
                            db.sql(tr, _.map(cards, function(eC) {                                                                          // формирование списка тегов у кажой записи
                                return 'SELECT T.* FROM Tag AS T, Card_Tag AS CT WHERE T.id = CT.id_tag AND id_card = ' + eC.id + ' ORDER BY T.name ASC;';
                            })).done(function() {
                                _.each(_.toArray(arguments.callee.arguments), function(result, index) {
                                    cards[index].aTags = db.toArray(result);
                                });
                                cards = _.groupBy(cards, function(eC) {                                                                     // разбиение записей в группы по id шаблона
                                    return eC.id_template;
                                });
                                db.sql(tr, 'SELECT * FROM Template WHERE id IN (' + _.keys(cards).join(', ') + ') ORDER BY name;').done(function(result) {    // формирование списка необходимых шаблонов
                                    $scope.aTemplates = db.toArray(result);
                                    _.each($scope.aTemplates, function(eT) {
                                        eT.aCards = cards[eT.id];
                                    });
                                    $scope.$digest();
                                });
                            });
                        });
                    });
                }
            };

            $root.$watch('ready', fnUpdate);
            $root.$watch('oFilter', fnUpdate);
            $root.$watch('sUpdateUI', fnUpdate);
        }])



        .controller('cTemplateList', ['$rootScope', '$scope', 'sDatabase', function($root, $scope, db) {
            var fnUpdate = function() {
                    if ($root.ready) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, 'SELECT * FROM Template ORDER BY name ASC;').done(function(result) {
                                $scope.aTemplates = db.toArray(result);
                                if ($scope.idOpen !== undefined) {
                                    fnLoadCards(_.indexOf($scope.aTemplates, _.find($scope.aTemplates, function(eT) {
                                        return eT.id === $scope.idOpen;
                                    })));
                                } else {
                                    $scope.$digest();
                                }
                            });
                        });
                    }
                },

                fnLoadCards = function(index) {
                    if (index === -1) {
                        $scope.$digest();
                        return;
                    }
                    var t = $scope.aTemplates[index];

                    if (t.aCards === undefined) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, 'SELECT * FROM Card WHERE id_template = ' + t.id + ' ORDER BY name;').done(function(result) {
                                t.aCards = db.toArray(result);
                                db.sql(tr, _.map(t.aCards, function(eC) {
                                        return 'SELECT T.* FROM Tag AS T, Card_Tag AS CT WHERE T.id = CT.id_tag AND id_card = ' + eC.id + ' ORDER BY T.name ASC;';
                                    })).done(function() {
                                        _.each(_.toArray(arguments.callee.arguments), function(result, index) {
                                            t.aCards[index].aTags = db.toArray(result);
                                        });
                                        $scope.$digest();
                                    });
                            });
                        });
                    }
                };

            $scope.fnOpen = function(index) {
                var t = $scope.aTemplates[index];

                if ($scope.idOpen !== t.id) {
                    $scope.idOpen = t.id;
                } else {
                    delete $scope.idOpen;
                }

                fnLoadCards(index);
            };

            $root.$watch('ready', fnUpdate);
            $root.$watch('sUpdateUI', fnUpdate);
        }])



        .controller('cTagList', ['$rootScope', '$scope', 'sDatabase', function($root, $scope, db) {
            var fnUpdate = function() {
                    if ($root.ready) {
                        db.connection.transaction(function(tr) {
                            db.sql(tr, [
                                'SELECT * FROM Tag WHERE id <> 0 ORDER BY name ASC;',
                                'SELECT * FROM Tag WHERE id = 0;'
                            ]).done(function(r0, r1) {
                                $scope.aTags = db.toArray(r0).concat(db.toArray(r1));
                                if ($scope.idOpen !== undefined) {
                                    fnLoadCards(_.indexOf($scope.aTags, _.find($scope.aTags, function(eT) {
                                        return eT.id === $scope.idOpen;
                                    })));
                                } else {
                                    $scope.$digest();
                                }
                            });
                        });
                    }
                },

                fnLoadCards = function(index) {
                    if (index === -1) {
                        $scope.$digest();
                        return;
                    }
                    var t = $scope.aTags[index];

                    if (t.aCards === undefined) {
                        var sql = 'SELECT C.*, T.name AS template FROM Card AS C, Template AS T' +
                            (t.id !== 0 ?
                            ', Card_Tag AS CT WHERE T.id = C.id_template AND C.id = CT.id_card AND CT.id_tag = ' + t.id :
                            ' WHERE T.id = C.id_template AND C.id NOT IN (SELECT DISTINCT id_card FROM Card_Tag)') +
                            ' ORDER BY name ASC;';

                        db.connection.transaction(function(tr) {
                            db.sql(tr, sql).done(function(result) {
                                t.aCards = db.toArray(result);
                                $scope.$digest();
                            });
                        });
                    }
                };

            $scope.fnOpen = function(index) {
                var t = $scope.aTags[index];

                if ($scope.idOpen !== t.id) {
                    $scope.idOpen = t.id;
                } else {
                    delete $scope.idOpen;
                }

                fnLoadCards(index);
            };

            $root.$watch('ready', fnUpdate);
            $root.$watch('sUpdateUI', fnUpdate);
        }]);

}(jQuery));