
document.addEventListener('DOMContentLoaded', function () {

  // color object for different event types
  var colors = {
    primary: "#7367f0",
    success: "#28c76f",
    danger: "#ea5455",
    warning: "#ff9f43"
  };


  // chip text object for different event types
  var categoryText = {
    primary: "Purpura",
    success: "Verde",
    danger: "Rojo",
    warning: "Naranja"
  };
  var categoryBullets = $(".cal-category-bullets").html(),
    evtColor = "",
    eventColor = "";

  // calendar init
  var calendarEl = document.getElementById('horarios');

  calendar = new FullCalendar.Calendar(calendarEl, {
    height:150,
    defaultView: 'dayGridWeek',
    eventOrder: "start",
    columnHeaderFormat:{ weekday: 'long'},
    locale: 'es',
    plugins: ["dayGrid", "timeGrid", "interaction"],
    customButtons: {
      addNew: {
        text: ' Agregar',
        click: function () {
          var calDate = new Date,
            todaysDate = calDate.toISOString().slice(0, 10);
            todayHour=calDate.toISOString().slice(11, 19);


          $('#form-agregar-horario').trigger("reset");

          $("#cal-event-title").val("").trigger("change");
          $("#cal-event-day").val("").trigger("change");

          $("#cal-start-date").val(todayHour);
          $("#cal-start-date").val(todayHour);
          $("#cal-end-date").val(todayHour);
          $("#cal-event-zone").val(moment.tz.guess()).trigger("change");
          $(".modal-calendar").modal("show");

          $(".modal-calendar .remove-event").addClass("d-none");
          $(".modal-calendar .cal-add-event").removeClass("d-none")
          $(".modal-calendar .cancel-event").removeClass("d-none")
          $(".modal-calendar .add-category .chip").remove();
          $(".modal-calendar #cal-start-date").attr("disabled", false);
        }
      }
    },
    header: {
      left: "addNew",
      center: "",
      right: ""
    },
    displayEventTime: false,
    navLinks: true,
    editable: true,
    allDay: true,
    navLinkDayClick: function (date) {
      $(".modal-calendar").modal("show");
    },
    dateClick: function (info) {

      $('#form-agregar-horario').trigger("reset");

      var calDate = new Date,
        todaysDate = calDate.toISOString().slice(0, 10);
        todayHour=calDate.toISOString().slice(11, 19);
        dateISO= calDate.toISOString();

      $("#cal-event-day").val(info.date.getDay()).trigger("change");
      $("#cal-event-zone").val(moment.tz.guess()).trigger("change");

      $("#cal-start-date").val(info.dateStr);
      $("#cal-end-date").val(info.dateStr);

    },
    // displays saved event values on click
    eventClick: function (info) {

      $(".modal-calendar").modal("show");

      $("#cal-id").val(info.event.id);
      $("#cal-start-date").val(moment(info.event.start).format('YYYY-MM-DD'));
      $("#cal-start-hour").val(info.event.extendedProps.start_hour);
      $("#cal-end-date").val(moment(info.event.end).format('YYYY-MM-DD'));
      $("#cal-end-hour").val(info.event.extendedProps.end_hour);
      $("#cal-description").val(info.event.extendedProps.description);


      $("#cal-event-title").val(info.event.extendedProps.title_id).trigger("change");
      $("#cal-event-zone").val(info.event.extendedProps.zone).trigger("change");
      $("#cal-event-day").val(info.event.extendedProps.day).trigger("change");



      $(".modal-calendar .remove-event").removeClass("d-none");
      $(".modal-calendar .cal-add-event").addClass("d-none");
      $(".modal-calendar .cancel-event").addClass("d-none");
      $(".calendar-dropdown .dropdown-menu").find(".selected").removeClass("selected");
      var eventCategory = info.event.extendedProps.dataEventColor;
      var eventText = categoryText[eventCategory];
      $(".modal-calendar .chip-wrapper .chip").remove();
      $(".modal-calendar .chip-wrapper").append($("<div class='chip chip-" + eventCategory + "'>" +
        "<div class='chip-body'>" +
        "<span class='chip-text'> " + eventText + " </span>" +
        "</div>" +
        "</div>"));
    },
  });

  // render calendar
  calendar.render();

  $.each(calendar_data, function (i, valor) {

    calendar.addEvent(valor);
    //$("#cal-start-date").val($(".fc-bg table tr:eq(0) td").eq(dia).data().date);
  });


  // appends bullets to left class of header
  $("#basic-examples .fc-right").append(categoryBullets);

  // Close modal on submit button


  // Remove Event
  $(".remove-event").on("click", function () {
    var removeEvent = calendar.getEventById($("#cal-id").val());
    removeEvent.remove();
  });


  // reset input element's value for new event
  if ($("td:not(.fc-event-container)").length > 0) {
    $(".modal-calendar").on('hidden.bs.modal', function (e) {
      $('.modal-calendar .form-control').val('');
    })
  }


$("#cal-event-day").change(function () {
    var dia=$("#cal-event-day option:selected").val();
    $("#cal-start-date").val($(".fc-bg table tr:eq(0) td").eq(dia).data().date);
    $("#cal-end-date").val($(".fc-bg table tr:eq(0) td").eq(dia).data().date);
});




  // open add event modal on click of day
  $(document).on("click", ".fc-day", function () {

    $("#cal-event-title").val("").trigger("change");
    $("#cal-event-day").val("").trigger("change");
    $("#cal-event-zone").val(moment.tz.guess()).trigger("change");


    $(".modal-calendar").modal("show");
    $(".calendar-dropdown .dropdown-menu").find(".selected").removeClass("selected");

    $(".modal-calendar .remove-event").addClass("d-none");
    $(".modal-calendar .cal-add-event").removeClass("d-none");
    $(".modal-calendar .cancel-event").removeClass("d-none");
    $(".modal-calendar .add-category .chip").remove();
    $(".modal-calendar .modal-footer .btn").attr("disabled", false);

    evtColor = colors.primary;
    eventColor = "primary";
  });

  // change chip's and event's color according to event type
  $(".calendar-dropdown .dropdown-menu .dropdown-item").on("click", function () {
    var selectedColor = $(this).data("color");
    evtColor = colors[selectedColor];
    eventTag = categoryText[selectedColor];
    eventColor = selectedColor;

    // changes event color after selecting category
    $(".cal-add-event").on("click", function () {
      calendar.addEvent({
        color: evtColor,
        dataEventColor: eventColor,
        className: eventColor
      });
    })

    $(".calendar-dropdown .dropdown-menu").find(".selected").removeClass("selected");
    $(this).addClass("selected");

    // add chip according to category
    $(".modal-calendar .chip-wrapper .chip").remove();
    $(".modal-calendar .chip-wrapper").append($("<div class='chip chip-" + selectedColor + "'>" +
      "<div class='chip-body'>" +
      "<span class='chip-text'> " + eventTag + " </span>" +
      "</div>" +
      "</div>"));
  });

  // calendar add event
  $(".cal-add-event").on("click", function () {

    if($("#cal-event-title option:selected").val()=="" || $("#cal-event-day option:selected").val()=="" || $("#cal-start-date").val() == "" || $("#cal-end-date").val() == "" || $("#cal-start-hour").val() == "" || $("#cal-end-hour").val() == ""){

      Swal.fire({
        title: "Llene todos los datos para continuar",
        text: "Verifique los datos",
        type: "warning",
        confirmButtonClass: 'btn btn-primary',
        buttonsStyling: false,
      });

    }else{

      var beginningTime = moment($("#cal-start-hour").val(), 'HH:mm');
      var endTime = moment($("#cal-end-hour").val(), 'HH:mm');


      if(beginningTime.isBefore(endTime)){

        $(".modal-calendar").modal("hide");

        var eventTitle = $("#cal-event-title").find('option:selected').text(),
          title_id = $("#cal-event-title").find('option:selected').val(),
          startHour = $("#cal-start-hour").val(),
          startDate = $("#cal-start-date").val() + " " + $("#cal-start-hour").val(),
          endHour = $("#cal-end-hour").val(),
          endDate = $("#cal-end-date").val() + " "+ $("#cal-end-hour").val(),
          eventDescription = $("#cal-description").val() || "",
          correctEndDate = new Date(endDate),
          id=Math.floor(Math.random() * (99999 - 100)) + 100;


        calendar.addEvent({
          id: id,
          daysOfWeek: [$("#cal-event-day option:selected").val()],
          title: eventTitle,
          //start: startDate,
          //end: correctEndDate,
          startTime:$("#cal-start-hour").val(),
          endTime:$("#cal-end-hour").val(),
          description: eventDescription,
          color: evtColor,
          dataEventColor: eventColor,
          allDay: false,
          title_id:title_id,
          day:$("#cal-event-day option:selected").val(),
          zone:$("#cal-event-zone option:selected").val(),
          start_hour:$("#cal-start-hour").val(),
          end_hour:$("#cal-end-hour").val(),

        });

      }else{

        Swal.fire({
          title: "La hora de inicio no puede ser mayor a la hora final",
          text: "Ajuste el rango de horas",
          type: "warning",
          confirmButtonClass: 'btn btn-primary',
          buttonsStyling: false,
        });
      }




    }



  });

  // date picker
  $(".pickadate").pickadate({
    format: 'yyyy-mm-dd',
  });

  $(".pickatime-horarios").pickatime({
    format: 'HH:i',
    formatLabel: 'hh:i a',
  });

    });
