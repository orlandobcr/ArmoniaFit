var modo=0;  //lectura 0    edicion 1


$(document).ready(function() {



  "use strict"
  // init list view datatable
  var dataListView = $(".data-list-view").DataTable({
    responsive: false,
    columnDefs: [
      {
        orderable: true,
        targets: 0,
        checkboxes: { selectRow: false}
      }
    ],
    dom:
      '<"top"<"actions action-btns"B><"action-filters"lf>><"clear">rt<"bottom"<"actions">p>',
    oLanguage: {
      sLengthMenu: "_MENU_",
      sSearch: ""
    },
    aLengthMenu: [[4, 10, 15, 20], [4, 10, 15, 20]],
    select: {
      style: "multi"
    },
    order: [[0, "asc"]],
    bInfo: false,
    pageLength: 4,
    buttons: [
      {
        text: "<i class='feather icon-plus'></i> Agregar nueva solicitud",
        action: function() {


                            Swal.fire({
                              title: '<strong>¿Tipo de estudio?',
                              type: 'warning',
                              html:
                                'Seleccione: ',
                              showCloseButton: true,
                              showCancelButton: true,
                              focusConfirm: true,
                              confirmButtonText:
                                '<span>Pre-empleo o Rutina</span>',
                              confirmButtonAriaLabel: 'Pre-empleo o rutina',
                              cancelButtonText:
                                '<span>Investigación</span>',
                              cancelButtonAriaLabel: 'Investigación',
                              confirmButtonClass: 'btn btn-primary',
                              buttonsStyling: false,
                              cancelButtonClass: 'btn btn-primary ml-1',
                            }).then((result) => {
                              if (result.value) {

                                $("#form_id")[0].reset();
                                $(this).removeClass("btn-secondary")
                                $(".add-new-data").addClass("show")
                                $(".overlay-bg").addClass("show")
                                $("#data-name, #data-price").val("")
                                $("#preempleo").show();
                                $("#investigacion").hide();

                              }else{

                                  $("#form_id2")[0].reset();
                                  $(this).removeClass("btn-secondary")
                                  $(".add-new-data").addClass("show")
                                  $(".overlay-bg").addClass("show")
                                  $("#preempleo").hide();
                                  $("#investigacion").show();


                                }
                              })

        },
        className: "btn-primary"
      }
    ],
    initComplete: function(settings, json) {
      $(".dt-buttons .btn").removeClass("btn-secondary")
    }
  });

  dataListView.on('draw.dt', function(){
    setTimeout(function(){
      if (navigator.userAgent.indexOf("Mac OS X") != -1) {
        $(".dt-checkboxes-cell input, .dt-checkboxes").addClass("mac-checkbox")
      }
    }, 50);
  });


  // To append actions dropdown before add new button
  var actionDropdown = $(".actions-dropodown")
  actionDropdown.insertBefore($(".top .actions .dt-buttons"))


  // Scrollbar
  if ($(".data-items").length > 0) {
    new PerfectScrollbar(".data-items", { wheelPropagation: false })
  }

  // Close sidebar
  $(".hide-data-sidebar, .cancel-data-btn, .overlay-bg").on("click", function() {
    $(".add-new-data").removeClass("show")
    $(".overlay-bg").removeClass("show")

  })



  // mac chrome checkbox fix
  if (navigator.userAgent.indexOf("Mac OS X") != -1) {
    $(".dt-checkboxes-cell input, .dt-checkboxes").addClass("mac-checkbox")
  }
})
