/*=========================================================================================
    File Name: picker-date-time.js
    Description: Pick a date/time Picker, Date Range Picker JS
    ----------------------------------------------------------------------------------------
    Item Name: Vuexy  - Vuejs, HTML & Laravel Admin Dashboard Template
    Author: Pixinvent
    Author URL: hhttp://www.themeforest.net/user/pixinvent
==========================================================================================*/
(function(window, document, $) {
    'use strict';

    /*******    Pick-a-date Picker  *****/
    // Basic date
    $('.pickadate').pickadate();

    // Format Date Picker
    $('.format-picker').pickadate({
        format: 'mmmm dd, yyyy'
    });

    // Date limits
    $('.pickadate-limits').pickadate({
        min: [2020,3,20],
        max: [2020,5,28]
    });

    // Disabled Dates & Weeks

    $('.pickadate-disable').pickadate({
        disable: [
            1,
            [2019,3,6],
            [2019,3,20]
        ]
    });

    // Picker Translations
    $( '.pickadate-translations' ).pickadate({
        format: 'yyyy-mm-dd',
        monthsFull: [ 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre' ],
        monthsShort: [ 'En', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic' ],
        weekdaysShort: [ 'Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab' ],
        today: 'hoy',
        clear: 'borrar',
        close: 'Cerrar',
        selectYears: true,
        selectMonths: true,
        max: [2002,1,1]
    });

    // Month Select Picker
    $('.pickadate-months').pickadate({
        selectYears: false,
        selectMonths: true
    });

    // Month and Year Select Picker
    $('.pickadate-months-year').pickadate({
        selectYears: true,
        selectMonths: true
    });

    // Short String Date Picker
    $('.pickadate-short-string').pickadate({
        weekdaysShort: ['S', 'M', 'Tu', 'W', 'Th', 'F', 'S'],
        showMonthsShort: true
    });

    // Change first weekday
    $('.pickadate-firstday').pickadate({
        firstDay: 1
    });



    /*******    Pick-a-time Picker  *****/
    // Basic time
    $('.pickatime').pickatime();

    // Format options
    $('.pickatime-format').pickatime({
        // Escape any “rule” characters with an exclamation mark (!).
        format: 'T!ime selected: h:i a',
        formatLabel: 'HH:i a',
        formatSubmit: 'HH:i',
        hiddenPrefix: 'prefix__',
        hiddenSuffix: '__suffix'
    });


    // Format options
    $('.pickatime-formatlabel').pickatime({
        formatLabel: function(time) {
            var hours = ( time.pick - this.get('now').pick ) / 60,
                label = hours < 0 ? ' !hours to now' : hours > 0 ? ' !hours from now' : 'now';
            return  'h:i a <sm!all>' + ( hours ? Math.abs(hours) : '' ) + label +'</sm!all>';
        }
    });

    // Min - Max Time to select
    $( '.pickatime-min-max').pickatime({

        // Using Javascript
        min: new Date(2015,3,20,7),
        max: new Date(2015,7,14,18,30)

        // Using Array
        // min: [7,30],
        // max: [14,0]
    });

    // Intervals
    $('.pickatime-intervals').pickatime({
        interval: 150
    });

    // Disable Time
    $('.pickatime-disable').pickatime({
        disable: [
        // Disable Using Integers
            3, 5, 7, 13, 17, 21

        /* Using Array */
            // [0,30],
            // [2,0],
            // [8,30],
            // [9,0]
        ]
    });


    // Close on a user action
    $('.pickatime-close-action').pickatime({
        closeOnSelect: false,
        closeOnClear: false
    });


})(window, document, jQuery);
