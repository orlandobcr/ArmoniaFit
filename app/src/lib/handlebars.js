const pool = require('../database');
const {format} = require('timeago.js');
const he = require('he');
const numberToText = require('numero-a-letras');

//console.log(test);

var handlebars = require('handlebars');
handlebars.registerHelper('moment', require('helper-moment'));

var helpers2 = require('handlebars-helpers');
var math = helpers2.math();
var number = helpers2.number();


const jsonfile = require('jsonfile');

var dep_obj;
var city_obj;

/*
const file_dep = 'src/public/assets/data/departamentos.json';
jsonfile.readFile(file_dep, function (err, obj) {
  if (err) console.error(err)
  dep_obj=obj;
})

const file_city = 'src/public/assets/data/ciudades.json';
jsonfile.readFile(file_city, function (err, obj) {
  if (err) console.error(err)
  city_obj=obj;
})
*/

const helpers = {};


helpers.number2text = (number) =>{

return numberToText.NumerosALetras(NUMBER);

};


helpers.find_dep = (dep_id) =>{

for (var i = 0; i < dep_obj.length; i++){
  if (dep_obj[i].departamentoId == dep_id){
    return dep_obj[i].nombreDepartamento;
  }
}

};

helpers.find_city = (city_id) =>{

  for (var i = 0; i <city_obj.length; i++){
    if (city_obj[i].ciudadId == city_id){
      return city_obj[i].nombreCiudad;
    }
  }

};

helpers.total_venta= (valor) =>{

      total=valor+(valor*0.19);
      return total;


};


helpers.decode_html= (data) =>{

  //let buff = new Buffer(data, 'base64');
  //let text = buff.toString('ascii');
    return he.decode(data);
};






helpers.coordinador = (c1,c2,c3,c4,c5,options) =>{

     var result = c1+c2+c3+c4+c5;
    // console.log(result);

     if (result>0) {
         return options.fn(this);
     } else {
         return options.inverse(this);
     }

};




helpers.compare = (lvalue, rvalue, options) =>{

    if (arguments.length < 3)
        throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

    var operator = options.hash.operator || "===";

    var operators = {
        '==':       function(l,r) { return l == r; },
        '===':      function(l,r) { return l === r; },
        '!=':       function(l,r) { return l != r; },
        '<':        function(l,r) { return l < r; },
        '>':        function(l,r) { return l > r; },
        '<=':       function(l,r) { return l <= r; },
        '>=':       function(l,r) { return l >= r; },
        'typeof':   function(l,r) { return typeof l == r; }
    }

    if (!operators[operator])
        throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

    var result = operators[operator](lvalue,rvalue);

    if( result ) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }

};



helpers.timeago = (timestamp) => {
  return format(timestamp);
};



module.exports = helpers;
