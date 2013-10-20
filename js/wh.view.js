(function($) {

    angular.module('mView', [])

        .directive('dStyleText', function() {
            return function(scope, el, attr) {
                el.wrap('<div class="x-text"></div>');
                if (el.attr('readonly') === undefined) {
                    el.after(
                        $('<a class="clear"></a>').click(function() {
                            scope.$eval(attr.ngModel + ' = ""');
                            el.focus();
                            scope.$digest();
                        })
                    );
                } else {
                    el.parent('.x-text').addClass('m-readonly');
                }
            };
        })



        .directive('dStyleDate', function() {
            return function(scope, el, attr) {
                var format = scope.$eval(attr.dStyleDate),
                    $wrap,
                    $date = $('<div class="datepicker"></div>'),

                    fnShow = function() {
                        $wrap.addClass('m-open');
                        if ($date.offset().top + $date.height() > $(window).scrollTop() + $(window).height()) {
                            $wrap.addClass('m-top');
                        }
                        $('body').on('click', fnHide);
                    },

                    fnHide = function(ev) {
                        if (!($wrap.find(ev.target).length || $(ev.target).is('.ui-datepicker-prev, ui-datepicker-next'))) {
                            $('body').off('click', fnHide);
                            $wrap.removeClass('m-open').removeClass('m-top');
                        }
                    };

                el.wrap('<div class="x-date"><div class="x-text"></div></div>').after(
                    $('<a class="clear"></a>').click(function() {
                        scope.$eval(attr.ngModel + ' = ""');
                        scope.$digest();
                    })
                );

                $wrap = el.closest('.x-date');

                $date.appendTo($wrap).datepicker({
                    changeMonth: true,
                    changeYear: true,
                    dateFormat: format === '' ? 'yy-mm-dd' : format,
                    firstDay: 1,
                    altField: el,
                    onSelect: function(dateText) {
                        scope.$eval(attr.ngModel + ' = "' + dateText + '"');
                    }
                });

                el.focus(fnShow);

                scope.$watch(attr.ngModel, function() {
                    var date = scope.$eval(attr.ngModel);
                    if (date !== '') {
                        $date.datepicker('setDate', date);
                    }
                });
            };
        })



        .directive('dStyleTextarea', function() {
            return function(scope, el, attr) {
                el.wrap('<div class="x-textarea"></div>');

                if (el.attr('readonly') === undefined) {
                    el.after(
                        $('<a class="clear"></a>').click(function() {
                            scope.$eval(attr.ngModel + ' = ""');
                            el.focus();
                            scope.$digest();
                        })
                    );
                } else {
                    el.parent('.x-textarea').addClass('m-readonly');
                }
            };
        })



        .directive('dStyleSelect', function() {
            return function(scope, el, attr) {
                el.wrap('<div class="x-select"></div>');
                if (el.attr('data-placeholder') === undefined) {
                    el.attr('data-placeholder', ' ');
                }
                if (el.attr('multiple') !== undefined) {
                    $('<a class="clear"></a>').appendTo(el.parent('.x-select')).click(function() {
                        var jChzn = el.next('.chzn-container');
                        jChzn.find('.chzn-choices .search-choice').remove();
                        jChzn.find('.chzn-drop .chzn-results .result-selected').removeClass('result-selected').addClass('active-result');
                        scope.$eval(attr.ngModel + ' = []');
                        scope.$digest();
                    });
                }

                var fnStyle = function() {
                    var model = scope.$eval(attr.ngModel),
                        optModel = scope.$eval(attr.dStyleSelect);

                    if (model === undefined || optModel === undefined) {
                        return;
                    }

                    var $opt = el.find('> option'),

                        dfd = $.Deferred()
                            .done(function() {
                                el.val(model).removeClass('chzn-done').next('.chzn-container').remove();
                                el.chosen({width: '100%'}).next('.chzn-container').on('click', '.chzn-results > li', function() {
                                    el.trigger('liszt:updated');
                                });
                            })
                            .fail(function() {
                                setTimeout(fnStyle, 25);
                            });

                    if (!$opt.filter('[value^="{{"]').length && ($opt.length - $opt.filter('[value^="? "]').length === optModel.length)) {
                        dfd.resolve();
                    } else {
                        dfd.reject();
                    }
                };

                scope.$watch(attr.ngModel, function() {
                    fnStyle();
                });
                scope.$watch(attr.dStyleSelect, function() {
                    fnStyle();
                });
            };
        })



        .directive('dBindTemplate', ['$compile', function($compile) {
            return function(scope, el, attr) {
                scope.$watch(attr.dBindTemplate, function() {
                    el.empty().append($compile('<div>' + scope.$eval(attr.dBindTemplate) + '</div>')(scope).find('> *'));
                });
            };
        }])



        .directive('dValidate', function() {
            return {
                priority: 10000,

                link: function(scope, el, attr) {
                    el.click(function(ev) {

                        var jForm = el.closest('form');
                        jForm.find('.x-text, .x-textarea, .x-select').removeClass('m-invalid');

                        ev.invalid = $($.grep(
                            jForm.find('input[type="text"], textarea, select').filter('.m-required').toArray(),
                            function(el) {
                                var jEl = $(el);
                                if (jEl.is('select[multiply]')) {
                                    return !jEl.val().length;
                                } else {
                                    return $.trim(jEl.val()) === '';
                                }
                            }
                        )).closest('.x-text, .x-textarea, .x-select').addClass('m-invalid').length;
                    });
                }
            };
        })



        .directive('dClickSelect', function() {
            var fnSelect = function(el) {
                var rng = document.createRange(),
                    sel = window.getSelection();
                rng.selectNode(el);
                sel.removeAllRanges();
                sel.addRange(rng);
            };

            return function(scope, el, attr) {
                el.click(function(ev) {
                    var $this = $(this);
                    if ($this.is('.value.m-password')) {
                        fnSelect($this.find('.hidden')[0]);
                        $this.find('.visible').addClass('m-selected');
                        setTimeout(function() {
                            $('body').one('click', function(ev) {
                                if (!(ev.target === $this[0] || $(ev.target).parent()[0] === $this[0])) {
                                    $this.find('.visible').removeClass('m-selected');
                                }
                            });
                        }, 50);
                    } else if (ev.target === this) {
                        if ($this.is('input[type="text"], textarea')) {
                            this.select();
                        } else {
                            fnSelect(this);
                        }
                        ev.preventDefault();
                    }
                });
            };
        })



        .filter('fEquals', function() {
            return function(target, a, b) {
                return angular.equals(a, b) ? target : '';
            };
        })



        .filter('fCount', function() {
            return function(obj) {
                switch ($.type(obj)) {
                    case 'object':
                        return _.size(obj);
                    case 'array':
                    case 'string':
                        return obj.length;
                    case 'number':
                    case 'boolean':
                        return obj ? 1 : 0;
                }
            };
        })



        .filter('fMatch', function() {
            return function(target, text, re) {
                return (new RegExp(re)).test(text)? target : '';
            };
        })



        .filter('fAsterisk', function() {
            return function(target) {
                return target.replace(/./g, '*');
            };
        })



        .filter('fSplit', function() {
            return function(target, separator) {
                return target.split(new RegExp(separator));
            };
        })



        .animation('fx-show-spoiler', ['vFXDuration', function(duration) {
            return {
                setup : function(el) {
                    var h = el.height();
                    el.css({
                        opacity: 0,
                        height: 0,
                        overflow: 'hidden',
                        display: 'block'
                    });
                    return h;
                },
                start : function(el, cb, data) {
                    el.animate({
                        opacity: 1,
                        height: data
                    }, duration, function() {
                        el.css({
                            opacity: '',
                            height: '',
                            overflow: ''
                        });
                        cb();
                    });
                }
            };
        }])



        .animation('fx-hide-spoiler', ['vFXDuration', function(duration) {
            return {
                setup : function(el) {
                    el.css({
                        opacity: 1,
                        height: el.height(),
                        overflow: 'hidden'
                    });
                },
                start : function(el, cb) {
                    el.animate({
                        opacity: 0,
                        height: 0
                    }, duration, function() {
                        el.css({
                            opacity: '',
                            height: '',
                            overflow: '',
                            display: 'none'
                        });
                        cb();
                    });
                }
            };
        }]);

}(jQuery));