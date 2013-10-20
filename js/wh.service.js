(function($) {

    angular.module('mService', [])

        .factory('sDatabase', function() {

            var db = openDatabase('Warehouse', '1.0', '', 5 * 1024 * 1024),
                ready = $.Deferred(),                                                                                                       // arg = [created]

                sGetTables = 'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "/__%"ESCAPE"/" AND name NOT LIKE "sqlite_sequence";',

                aIOTables = [{
                    name: 'Template',
                    aFields: ['id', 'name', 'desc']
                }, {
                    name: 'Card',
                    aFields: ['id', 'name', 'desc', 'id_template']
                }, {
                    name: 'Tag',
                    aFields: ['id', 'name', 'desc']
                }, {
                    name: 'Card_Tag',
                    aFields: ['id', 'id_card', 'id_tag']
                }, {
                    name: 'Field',
                    aFields: ['id', 'name', 'extra', 'order', 'id_type', 'id_template']
                }, {
                    name: 'Data',
                    aFields: ['id', 'id_card', 'id_field', 'value']
                }],

                fnToArray = function(oResult) {
                    var aResult = [];
                    for (var i = 0; i < oResult.rows.length; i++) {
                        aResult.push(oResult.rows.item(i));
                    }
                    return aResult;
                },

                fnSql = function(tr, aQuery) {
                    var oThis = this,
                        aResult = [],
                        count = 0,
                        dfd = $.Deferred(),

                        fnSuccess = function(tr, result) {
                            aResult.push(result);
                            count++;
                            if (count === aQuery.length) {
                                dfd.resolveWith(oThis, aResult);
                            } else {
                                fnSql(count);
                            }
                        },

                        fnError = function(tr, error) {
                            var str = 'Web SQL Error!\nCode: ' + error.code + '\nMessage: ' + error.message;
                            if (_.isString(aQuery[count])) {
                                str += '\nQuery: ' + aQuery[count];
                            } else {
                                str += '\nQuery: ' + aQuery[count].query + '\nData: ' + aQuery[count].data;
                            }
                            throw str;
                        },

                        fnSql = function(i) {
                            if (_.isString(aQuery[i])) {
                                tr.executeSql(aQuery[i], [], fnSuccess, fnError);
                            } else {
                                tr.executeSql(aQuery[i].query, aQuery[i].data, fnSuccess, fnError);
                            }
                        };

                    if (!_.isArray(aQuery)) {
                        aQuery = [aQuery];
                    }

                    if (aQuery.length) {
                        fnSql(count);
                    } else {
                        dfd.resolveWith(oThis, []);
                    }
                    return dfd;
                },

                fnReset = function(cb) {
                    db.transaction(function(tr) {
                        fnClear(tr, function() {
                            fnCreate(tr, function() {
                                (cb || $.noop)();
                            });
                        });
                    });
                },

                fnClear = function(tr, cb) {
                    fnSql(tr, sGetTables).done(function(rT) {
                        if (rT.rows.length) {
                            fnSql(tr, _.map(fnToArray(rT), function(eT) {
                                return 'DROP TABLE ' + eT.name + ';';
                            })).done(cb || $.noop);
                        } else {
                            (cb || $.noop)();
                        }
                    });
                },

                fnCreate = function(tr, cb) {
                    var aSql = [];
                    _.each(dbData, function(t) {
                        aSql = aSql.concat(
                            [t.schema],
                            _.map(t.data, function(d) {
                                return {query: t.query, data: d};
                            })
                        );
                    });
                    fnSql(tr, aSql).done(cb || $.noop);
                },

                fnExport = function(cb) {
                    db.transaction(function(tr) {
                        fnSql(tr, _.map(aIOTables, function(eT) {
                            return 'SELECT * FROM ' + eT.name + ' WHERE id <> 0;';
                        })).done(function() {
                            var aResult = [];
                            _.each(_.toArray(arguments.callee.arguments), function(eT, iT) {
                                aResult.push(
                                    _.map(fnToArray(eT), function(eR) {
                                        return _.map(aIOTables[iT].aFields, function(eF) {
                                            return eR[eF];
                                        });
                                    })
                                );
                            });
                            (cb || $.noop)(aResult);
                        });
                    });
                },

                fnImport = function(aData, cb) {
                    fnReset(function() {
                        db.transaction(function(tr) {
                            var aSql = [];
                            _.each(aData, function(eT, iT) {
                                _.each(eT, function(eR) {
                                    aSql.push({
                                        query: 'INSERT INTO ' + aIOTables[iT].name + ' ("' + aIOTables[iT].aFields.join('", "') + '") VALUES (' +
                                            _.range(aIOTables[iT].aFields.length).join(', ').replace(/[0-9]/g, '?') + ');',
                                        data: eR
                                    });
                                });
                            });
                            fnSql(tr, aSql).done(function() {
                                (cb || $.noop)();
                            });
                        });
                    });
                };

            db.transaction(function(tr) {
                fnSql(tr, sGetTables).done(function(rT) {
                    if (rT.rows.length === 0) {                                                                                             // Создание БД
                        fnImport(dbDataExample, function() {
                            ready.resolve(true);
                        });
                    } else {
                        ready.resolve(false);
                    }
                });
            });

            return {
                connection: db,
                ready: ready,
                sql: fnSql,
                toArray: fnToArray,
                reset: fnReset,
                export: fnExport,
                import: fnImport
            };
        })



        .factory('sVersion', ['sDatabase', function(db) {
            var ready = $.Deferred(),
                vLast = localStorage.version || '0',
                vCur = 0,

                fnCompare = function(a, b) {
                    var fn2Int = function(str) {
                            return _.reduce(str.split('.'), function(r, val, i) {
                                return r + parseInt(val) * Math.pow(0.01, i);
                            }, 0) * 1e8;
                        },

                        fnCompare = function(a, b) {
                            if (a > b) {
                                return 1;
                            } else if (a < b) {
                                return -1;
                            } else {
                                return 0;
                            }
                        };

                    return fnCompare(fn2Int(a), fn2Int(b));
                },

                fnUpdate = function(index, cb) {
                    if (index >= dbDataUpdate.length || fnCompare(dbDataUpdate[index].version, vCur) > 0) {
                        (cb || $.noop)();
                        return;
                    }
                    if (fnCompare(dbDataUpdate[index].version, vLast) <= 0) {
                        fnUpdate(index + 1, cb);
                    } else {
                        dbDataUpdate[index].fnUpdate(db, function() {
                            vLast = dbDataUpdate[index].version;
                            fnUpdate(index + 1, cb);
                        });
                    }
                };

            $.getJSON('../manifest.json', function(data) {
                vCur = data.version;
                db.ready.done(function(created) {
                    if (created) {
                        localStorage.version = vCur;
                        ready.resolve();
                    } else {
                        if (vCur === vLast) {
                            ready.resolve();
                        } else {
                            fnUpdate(0, function() {
                                localStorage.version = vLast;
                                ready.resolve();
                            });
                        }
                    }
                });
            });

            return {
                version: vCur,
                ready: ready
            };
        }])



        .factory('sUpdateUI', ['$rootScope', function($root) {
            $root.sUpdateUI = Date.now();
            return function(watch) {
                if (_.isFunction(watch)) {
                    $root.$watch('sUpdateUI', watch);
                } else {
                    $root.sUpdateUI = Date.now();
                    $root.$digest();
                }
            };
        }])



        .factory('sModal', function() {
            var xModal = null,

                fnOpen = function(content, params) {
                    if (xModal === null) {
                        xModal = new XModal($.extend({}, params, {
                            cbAfterClose: function(oThis) {
                                xModal = null;
                                (params.cbAfterClose || $.noop)(oThis);
                            }
                        }));
                        xModal.fnOpen(content);
                    }
                },

                fnClose = function() {
                    if (xModal !== null) {
                        xModal.fnClose();
                    }
                };

            function XModal(params) {
                $.extend(this, {
                    $data: null,
                    $body: $('body'),

                    wScroll: 0,
                    duration: 200,
                    open: false,

                    $ph: $('<div id="xm-placeholder"></div>'),
                    $content: $('<div id="xm-content"></div>').css({display: 'none'}),
                    $wrapper: $('<div id="xm-content-wrapper"></div>'),
                    $overlay: $('<div id="xm-overlay"></div>').css({display: 'none'}),
                    $container: $('<div id="xm-container"></div>'),

                    params: $.extend({
                        cbBeforeOpen: $.noop,
                        cbBeforeShow: $.noop,
                        cbAfterShow: $.noop,
                        cbBeforeHide: $.noop,
                        cbAfterHide: $.noop,
                        cbAfterClose: $.noop
                    }, params)
                });

                this.$container.append(this.$wrapper.append(this.$content), this.$overlay);
            }

            XModal.prototype = {

                fnOpen: function($data) {
                    this.$data = $data;
                    /*this.$wrapper.click($.proxy(function(e) {
                        if (e.target === e.currentTarget) {
                            this.fnClose();
                        }
                    }, this));*/

                    this.params.cbBeforeOpen(this);

                    this.wScroll = -this.$body.css({overflow: 'scroll'}).width() + this.$body.css({overflow: 'hidden'}).width();
                    this.$overlay.css({marginRight: this.wScroll});

                    this.fnResize();
                    $(window).on('resize', $.proxy(this.fnResize, this));

                    this.$data.after(this.$ph).detach().appendTo(this.$content);
                    this.$body.append(this.$container);

                    this.params.cbBeforeShow(this);

                    this.$overlay.fadeIn(this.duration, $.proxy(function() {
                        this.$content.fadeIn(this.duration, $.proxy(function() {

                            this.open = true;
                            this.params.cbAfterShow(this);

                        }, this));
                    }, this));
                },

                fnClose: function() {
                    if (!this.open) {
                        return;
                    }
                    this.open = false;

                    this.params.cbBeforeHide(this);

                    this.$content.fadeOut(this.duration, $.proxy(function() {
                        this.$overlay.fadeOut(this.duration, $.proxy(function() {

                            this.params.cbAfterHide(this);

                            this.$container.detach();
                            this.$ph.before(this.$data.detach()).detach();

                            $(window).off('resize', this.fnResize);
                            this.$body.css({
                                marginRight: '',
                                overflow: ''
                            });

                            this.params.cbAfterClose(this);

                        }, this));
                    }, this));
                },

                fnResize: function() {
                    this.$body.css({marginRight: $(document).height() > this.$body.height() ? this.wScroll : ''});
                    this.$wrapper.css({
                        width: this.$body.width(),
                        height: this.$body.height()
                    });
                }
            };

            return {
                open: fnOpen,
                close: fnClose
            };
        })



        .factory('sFile', ['sDatabase', 'sUpdateUI', function(db, upd) {

            var fnExport = (function() {
                    var add0 = function(num, r, after) {
                        num = num.toString();
                        while (num.length < r) {
                            if (after) {
                                num += '0';
                            } else {
                                num = '0' + num;
                            }
                        }
                        return num;
                    };

                    return function() {
                        var d = new Date(),
                            aDate = [
                                d.getFullYear(),
                                add0(d.getMonth() + 1, 2),
                                add0(d.getDate(), 2)
                            ],
                            aTime = [
                                add0(d.getHours(), 2),
                                add0(d.getMinutes(), 2),
                                add0(d.getSeconds(), 2)
                            ];

                        db.export(function(oData) {
                            var oBlob = new Blob([JSON.stringify(oData)], { type : "text/plain", endings: "transparent"});
                            window.saveAs(oBlob, 'Warehouse-' + aDate.join('') + '-' + aTime.join('') + '.json');
                        });
                    };
                }()),

                fnImport = (function() {
                    var $input = $('<input type="file">'),
                        dOpen = null,

                        fnOpen = function() {
                            $input.click();
                            return (dOpen = $.Deferred());
                        },

                        onChange = function() {
                            dOpen.resolve($input[0].files[0]);
                        },

                        fnFile2Data = function(file, cb) {
                            var reader = new FileReader();
                            reader.onload = function(data) {
                                cb(data.target.result);
                            };
                            reader.readAsBinaryString(file);
                        };

                    $input.on('change', onChange);

                    return function() {
                        fnOpen().done(function(oFile) {
                            fnFile2Data(oFile, function(data) {
                                try {
                                    db.import(JSON.parse(data), function() {
                                        upd();
                                    });
                                } catch (e) {}
                            });
                        });
                    };
                }());

            return {
                export: fnExport,
                import: fnImport
            };
        }]);
}(jQuery));