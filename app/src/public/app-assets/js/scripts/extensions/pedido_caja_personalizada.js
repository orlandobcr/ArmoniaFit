
var total=0;

var total_pulpas=0;

function refresh(){

  total_pulpas=0;
  total=0;

     $('#contenido_caja').find('.subtotal').each(function() {
       //console.log(this.innerText);
       var sub=this.innerText;
       sub =  sub.substr(11, sub.length);
       sub =parseInt(sub, 10);
       total += sub;
    });

    $('#contenido_caja').find('.cantidad_pulpas').each(function() {
      //console.log(this.innerText);
      var cont =parseInt(this.innerText, 10);
      total_pulpas += cont;
   });

    $("#total_pulpas").html("Pulpas: "+total_pulpas);

    $("#total").html("Total: $"+total);

}

function sumar(id,precio) {

  if(total_pulpas<24){

    var cantidad = parseInt($("#cantidad_"+id).html(), 10)+1;

    $("#cantidad_"+id).html(cantidad);

    $("#subtotal_"+id).html("Subtotal: $"+precio*cantidad);

    total +=precio*cantidad;

  }



refresh();

}


function restar(id,precio) {

var cantidad = parseInt($("#cantidad_"+id).html(), 10)-1;

if(!cantidad<=0){

  $("#cantidad_"+id).html(cantidad);

  $("#subtotal_"+id).html("Subtotal: $"+precio*cantidad);

  total -=precio*cantidad;
}




refresh()

}




$(document).ready(function () {


  dragula([document.getElementById('pulpas_disponibles'), document.getElementById('contenido_caja')]).on('drop', (el, target, source, sibling) => {
    const elementId = $(el).attr("id");
    const targetID = $(target).attr("id");
    const sourceId = $(source).attr("id");

    if(targetID=="contenido_caja"){

    $("#opciones_"+elementId).removeClass('d-none');

    $("#descripcion_"+elementId).addClass('d-none');
    $("#precio_"+elementId).addClass('d-none');
    $("#subtotal_"+elementId).removeClass('d-none');


    refresh();

  }else{

    $("#opciones_"+elementId).addClass('d-none');
    $("#descripcion_"+elementId).removeClass('d-none');
    $("#precio_"+elementId).removeClass('d-none');
    $("#subtotal_"+elementId).addClass('d-none');

    refresh();
  }


});


});
