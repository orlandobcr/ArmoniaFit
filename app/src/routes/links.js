'use strict';
require('dotenv').config();
const {SESSION_SECRET} = process.env;
const express = require('express');
const router = express.Router();
const pool = require('../database');
const {isLoggedIn} = require('../lib/auth');
const nodemailer = require('nodemailer');
const moment = require('moment');
moment.locale('es');
const fs = require("fs");
var he = require('he');
const superagent = require('superagent');
var fileExtension = require('file-extension');
const resizer = require('node-image-resizer');

const numberToText = require('numero-a-letras');
const holidaysCO = require('colombia-holidays');
const jwt = require('jsonwebtoken');

const compress_images = require("compress-images");

const imageThumbnail = require('image-thumbnail');




const guardar = async (nombre, data) => {

  let writeStream = fs.createWriteStream(nombre);
  writeStream.write(data);

  writeStream.on('finish', () => {
    console.log('wrote all data to file');
  });

  writeStream.end();

}

function deco_date_pagos(cadena) {

  if (cadena.length > 1) {

    var fecha_tiempo = String(cadena).trim().split(" ");
    var fecha = String(fecha_tiempo[0]).trim().split("/");

    var dia = fecha[0] ? fecha[0] : "";
    var mes = fecha[1] ? fecha[1] : "";
    var ano = fecha[2] ? fecha[2] : "";

    var time = String(fecha_tiempo[1]).trim().split(":");


    var hora = "";
    var minutos = time[1] ? time[1] : "";
    var segundos = time[2] ? time[2] : "";



    if (fecha_tiempo[2] == "AM") {

      hora = time[0];
      if (String(time[0]) == "12") {
        hora = "00";
      }
    } else {
      hora = String(parseInt(time[0], 10) + 12);
    }

    var date_time = ano + "-" + mes + "-" + dia + " " + hora + ":" + minutos + ":" + segundos;

    return date_time;

  } else {

    return "";
  }



}






function pathExtractor(req) {
  // Escaping user input to be treated as a literal
  // string within a regular expression accomplished by
  // simple replacement
  function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
  }
  // Replace utility function
  function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
  }
  return replaceAll(req.get('referer'), req.get('origin'), '');
}




async function mail2(destinatario, asunto, mensaje_txt, mensaje_html) {

  let testAccount = await nodemailer.createTestAccount();

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'info@digitallcolombia.com', // generated ethereal user
      pass: 'Digitall!23' // generated ethereal password
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Info Ares Security" <info@digitall.io>', // sender address
    to: destinatario, // list of receivers
    subject: asunto, // Subject line
    text: mensaje_txt, // plain text body
    html: he.decode(mensaje_html),
  });


}


function check_holiday(date) {

  let ano = moment(date).format('YYYY');
  let hallazgo = 0;
  let res;
  festivos = holidaysCO.getColombiaHolidaysByYear(ano);

  festivos.forEach(function(key) {

    if (key.holiday === date | key.celebrationDay === date) {
      res = {
        holiday: 1,
        data: key
      };
      hallazgo = 1;
    }

  });

  if (hallazgo == 1) {
    return res;
  } else {

    return {
      holiday: 0
    };
  }

}




router.post('/sso',  async (req, res) => {

  var token;

  var user4chat;

  var data2send;

  if(req.user.email=="orlandobcr@gmail.com"){
    data2send = {
        username: "admin",
        password: 'Oa8001241234@'
      }

  }else{
    data2send = {
        username: "armonia_"+req.user.id,
        password: 'ArmoniaFit!23'
      }

  }
     const [response] =  await Promise.all([
      superagent.post('https://omni.digitall.io/api/v1/login')
      .send(data2send)
      .then(res => {

        if(res.body.status=="success"){
          token = res.body.data.authToken;
        }

      }).catch(err =>{
          console.log(err);
      })
    ]);


  if(token){

    var q_res=await pool.query('UPDATE usuarios set omni_token=? where id=?', [token,req.user.id]);
    console.log("Token omni actualizado");


    res.json({
      loginToken: token
    });

  }else{

    res.sendStatus(401);
  }

});


router.get('/chat_window', async (req, res) => {
  res.render('links/chat_window',{layout: false});
});

router.post('/login_omni', async (req, res) => {

console.log("ENTRO LOGIN");
var user4chat;

var data2send;

if(req.user.email=="orlandobcr@gmail.com"){
  user4chat="admin";

  data2send = {
      username: user4chat,
      password: 'Oa8001241234@'
    }

}else{
  user4chat="armonia_"+req.user.id;

  data2send = {
      username: user4chat,
      password: 'ArmoniaFit!23'
    }

}

var token;

  const [respuesta] = await Promise.all([
    superagent.post('https://omni.digitall.io/api/v1/login')
    .send(data2send)
    .then(res => {

      if(res.body.status=="success"){
        token = res.body.data.authToken;

      }

    }).catch(err =>{

        console.log(err);
    })
  ]);


if(token){
  var q_res=await pool.query('UPDATE usuarios set omni_token=? where id=?', [token,req.user.id]);
				res.set('Content-Type', 'text/html');
				res.send(`<script>
				window.parent.postMessage({
					event: 'login-with-token',
					loginToken: '${ token }'
				}, 'https://omni.digitall.io');
				</script>`);

}else{
  res.send({"status":0});
}


//res.send(respuesta.body.status);
//  console.log(respuesta);

});

router.get('/iniciar_aula', isLoggedIn, async (req, res) => {

  //console.log(req.user.email);

  var room = req.user.email;

  room = room.substring(0, room.indexOf("@"));

  var payload = {
    "context": {
      "user": {
        "name": req.user.nick,
        "email": req.user.email,
        "id": req.user.id.toString()
      }
    },
    "aud": "digitallpro",
    "iss": "digitallpro",
    "sub": "vchat.digitall.io",
    "room": room,
    "moderator": true
  };

  var token = jwt.sign(payload, SESSION_SECRET, {
    expiresIn: 14200 // expires in 6 horas
  });

  console.log(token);


  var url = "https://vchat.digitall.io/" + room + "?jwt=" + token;


  res.redirect(url);

  //res.write("<script>window.open('"+url+"','_blank');</script>");
});

router.get('/fechas_entregas', async (req, res) => {

  var disponibles = [];
  var cantidad;

  var dias_disponible = [];

  let fecha;
  let hora;

  if (req.query.cantidad) {
    cantidad = req.query.cantidad;
  } else {
    cantidad = 5;
  }

  if (req.query.fecha) {
    fecha = moment(req.query.fecha).format('YYYY-MM-DD');
    hora = moment(req.query.fecha).format('HH');
  } else {
    fecha = moment(Date.now()).format('YYYY-MM-DD');
    hora = moment(Date.now()).format('HH');
  }


  while (cantidad != 0) {

    let dia = moment(fecha).format('dddd');


    if (hora >= 11) {

      fecha = moment(fecha, "YYYY-MM-DD").add(1, 'days').format('YYYY-MM-DD');
      hora = 0;

    } else if (dia == "domingo") {

      fecha = moment(fecha, "YYYY-MM-DD").add(1, 'days').format('YYYY-MM-DD');

    } else if (dia == "sábado") {

      fecha = moment(fecha, "YYYY-MM-DD").add(2, 'days').format('YYYY-MM-DD');

    } else {
      var response = check_holiday(fecha);

      if (response.holiday == 1) {
        fecha = moment(fecha, "YYYY-MM-DD").add(1, 'days').format('YYYY-MM-DD');
      } else {

        var texto = moment(fecha).format('dddd, DD MMMM');
        var insert = {
          fecha,
          texto
        }
        disponibles.push(insert);
        dias_disponible.push(texto);
        fecha = moment(fecha, "YYYY-MM-DD").add(1, 'days').format('YYYY-MM-DD');
        cantidad -= 1;
      }
    }

  }
  //console.log(disponibles);

  //  while(cantidad!=0){
  res.set('Content-Type', 'application/json');
  res.json({
    disponibles: dias_disponible
  });
  //  }

});

router.get('/festivos_colombia', async (req, res) => {

  if (!req.query.fecha) {
    res.send({
      "status": 0
    });
  } else {
    let fecha = moment(req.query.fecha).format('YYYY-MM-DD');

    let response = check_holiday(fecha);

    res.send({
      status: 1,
      holiday: response.holiday,
      data: response.data
    });

  }
});

router.get('/fecha_actual', async (req, res) => {
  let fecha = moment(Date.now()).format('dddd, DD MMMM YYYY');

  let ano = moment(Date.now()).format('YYYY');

  res.send({
    "status": 1,
    "fecha": fecha,
    "ano": ano
  });

});

router.get('/formatear_fecha', async (req, res) => {

  if (!req.query.fecha) {
    res.send({
      "status": 0
    });
  } else {
    let fecha = moment(req.query.fecha).format('dddd, DD MMMM');
    let ano = moment(req.query.fecha).format('YYYY');
    res.send({
      "status": 1,
      "fecha": fecha,
      "ano": ano
    });
  }
});


router.get('/num2text', async (req, res) => {

  if (!req.query.numero) {
    res.send({
      "status": 0
    });
  } else {

    var numero = he.decode(req.query.numero);

    numero = numero.replace(/[ ,.'$]/g, "");

    numero = numero.trim();

    var texto = numberToText.NumerosALetras(numero);
    res.send({
      "status": 1,
      texto,
      numero
    });

  }




});



var key = "hj2vk5vi7l8hvks9gxxhs3v49j7h331z4rsbu8f2u9nw5kgv";


//router.post('/consulta_vehiculo',isLoggedIn, async (req, res) => {

router.get('/consulta_vehiculo', async (req, res) => {


  if (!req.query.documentType | !req.query.documentNumber | !req.query.vehicle) {

    res.send({
      "status": 0
    });

  } else {

    let documentType = req.query.documentType || "%";
    let documentNumber = req.query.documentNumber || "%";
    let vehicle = req.query.vehicle || "%";

    var data2send = {
      documentType,
      documentNumber,
      vehicle
    };


    const [respuesta] = await Promise.all([
      superagent.post('https://api.misdatos.com.co/api/co/runt/consultarVehiculo')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Authorization', key)
      .send(data2send)
      .then()
      .catch()
    ]);


    if (respuesta.body.statusCode == 200) {

      if (!respuesta.body.data.existe) { // sin existe igual false

        res.send({
          "status": 1,
          "data": respuesta.body.data
        });
      } else {

        res.send({
          "status": 0
        });
      }

    } else {

      res.send({
        "status": 0
      });

    }


  }


});


router.get('/consulta_cedula', async (req, res) => {

  if (!req.query.documentType | !req.query.documentNumber) {

    res.send({
      "status": 0
    });

  } else {

    let documentType = req.query.documentType || "%";
    let documentNumber = req.query.documentNumber || "%";

    var data2send = {
      documentType,
      documentNumber
    };


    const [respuesta] = await Promise.all([
      superagent.post('https://api.misdatos.com.co/api/co/consultarNombres')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Authorization', key)
      .send(data2send)
      .then()
      .catch(err => {
        console.log(err);
        res.send({
          "status": 0
        });

      })
    ]);


    if (respuesta.body.statusCode == 200) {

      res.send({
        "status": 1,
        "data": respuesta.body.data
      });

    } else {

      res.send({
        "status": 0
      });

    }


  }


});




//////////////////////////////////////  AFTER LOGIN////////////////////////////////////////
router.get('/', isLoggedIn, async (req, res) => {


  //console.log(categorias);
  res.render('/');

});
////////////////////////////////////  END AFTER LOGIN////////////////////////////////////////


////////////////////////////////////////DASHBOARD////////////////////////////////////////////
router.get('/index', isLoggedIn, async (req, res) => {
  //console.log(categorias);

  res.render('links/index');
});


////////////////////////////////////////DASHBOARD////////////////////////////////////////////
router.get('/resultados', async (req, res) => {
  //console.log(categorias);


  let categoria = req.query.categoria || "%";
  categoria = "%" + categoria + "%";

  let modalidad = req.query.modalidad || "%";
  modalidad = "%" + modalidad + "%";


  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');

  res.render('links/resultados',{categorias,query: req.query});
});


/////////////////////////////////////FIND DE DASHBOARD//////////////////////////////////////

router.get('/pedidos', isLoggedIn, async (req, res) => {
  //console.log(categorias);
  res.render('links/pedidos');
});



router.get('/gestion_precios_cajas', isLoggedIn, async (req, res) => {
  //console.log(categorias);

  //SELECT * FROM cajas as t1, ciudades as t2 WHERE t1.id_ciudad=t2.id_ciudad;

  const cajas = await pool.query('SELECT * FROM cajas as t1, ciudades as t2 WHERE t1.id_ciudad=t2.id_ciudad order by id_caja desc');
  const ciudades = await pool.query('SELECT * FROM ciudades WHERE 1');
  res.render('links/gestion_precios_cajas', {
    cajas,
    ciudades
  });
});


router.get('/detalle_caja/:id', isLoggedIn, async (req, res) => {
  //console.log(categorias);

  const {id} = req.params;

  const caja = await pool.query('SELECT * FROM cajas WHERE id_caja=?', [id]);

  const pulpas = await pool.query('SELECT * FROM pulpas WHERE 1');


  res.render('links/detalle_caja', {
    pulpas,
    nombre_caja: caja[0].nombre_caja
  });
});


router.post('/guardar_caja', isLoggedIn, async (req, res) => {
  //console.log(categorias);

  const {
    id_caja,
    nombre_caja,
    tipo_caja,
    referencia,
    precio_caja,
    cantidad_pulpas,
    imagen_producto,
    descripcion,
    id_ciudad
  } = req.body;
  var caja;
  console.log(id_ciudad);
  let file;

  if (req.files) {

    let archivo = req.files.imagen_producto;
    let ext = fileExtension(archivo.name);
    let nombre_archivo = "caja_" + referencia + "." + ext;

    archivo.mv('./src/public/imagenes/cajas/' + nombre_archivo);

    file = nombre_archivo;
  }


  console.log(precio_caja);
  if (id_caja) {
    caja = {
      id_caja,
      nombre_caja,
      tipo_caja,
      precio_caja: precio_caja == '' ? null : precio_caja,
      referencia,
      descripcion,
      cantidad_pulpas: cantidad_pulpas == '' ? null : cantidad_pulpas,
      imagen: file ? file : "",
      descripcion,
      id_ciudad
    }
  } else {
    caja = {
      nombre_caja,
      tipo_caja,
      precio_caja: precio_caja == '' ? null : precio_caja,
      referencia,
      descripcion,
      cantidad_pulpas: cantidad_pulpas == '' ? null : cantidad_pulpas,
      imagen: file ? file : "",
      descripcion,
      id_ciudad
    }

  }



  const q_res = await pool.query('INSERT INTO cajas set ? ON DUPLICATE KEY UPDATE ?', [caja, caja]);

  req.flash('success', 'Caja agregada');

  res.redirect('/links/gestion_precios_cajas');
});





////////////////////////////////////////USER MNG////////////////////////////////////////////


router.get('/agregar_usuario/:id', isLoggedIn, async (req, res) => {
  const {id} = req.params;
  const links = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);

  res.render('links/agregar_usuario', {
    links
  });
});


router.post('/agregar_usuario', isLoggedIn, async (req, res) => {

  const {
    nombre,
    apellido,
    email,
    contrasena,
    celular,
    id_cliente
  } = req.body;

  const validPassword = await helpers.encryptPassword(contrasena);

  const contra = contrasena;
  const newLink = {
    nombre,
    apellido,
    email,
    celular,
    contrasena: validPassword,
    id_cliente
  }

  //console.log(newLink);
  const q_res = await pool.query('INSERT INTO usuarios SET ? ', newLink);

  // ---------------------NOTICACION A USUARIO-------------------------------//
  let asunto = "Datos de Acceso - YoLitigo.co";
  let msg_txt = "Hola " + nombre + "! Has sido dado de alta en la plataforma YoLitigo.co, los siguientes son los datos de acceso: URL: https://yolitigo.co  usuario: " + email + " contraseña: " + contra + " podrás cambiar tu contraseña al entrar.";
  let msg_html = "<b>Hola " + nombre + "!</b><br><br> Has sido dado de alta en la plataforma YoLitigo, los siguientes son los datos de acceso: <br><br><b>URL:</b> https://yolitigo.co <br><b>Usuario:</b> " + email + " <br><b>Contraseña:</b> " + contra + " <br><br>Podrás cambiar tu contraseña al entrar.";


  mail2(email, asunto, msg_txt, msg_html);

  // ---------------------FIN NOTICACION A USUARIO-------------------------------//


  req.flash('success', 'Usuario creado exitosamente');
  res.redirect('/links/permisos_usuario_cliente/' + q_res.insertId);

});


router.get('/gestion_usuarios', isLoggedIn, async (req, res) => {

  let name = req.query.name || "%";
  name = "%" + name + "%";
  let lastname = req.query.lastname || "%";
  lastname = "%" + lastname + "%";
  let email = req.query.email || "%";
  email = "%" + email + "%";
  let mobile = req.query.mobile || "%";
  mobile = "%" + mobile + "%";

  let id_cliente = req.query.id_cliente || "%";

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const clientes = await pool.query('SELECT * FROM clientes WHERE id!=?', id_cliente);



  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id =?', id_cliente);

  if (nombre_cliente.length > 0) {
    nombre_cliente = nombre_cliente[0].razon_social;
  } else {
    nombre_cliente = undefined;
  }


  const usuarios = await pool.query('SELECT a.*,b.razon_social FROM usuarios AS a INNER JOIN clientes AS b ON (a.id_cliente=b.id) WHERE LOWER(a.nombre) LIKE LOWER(?) AND a.apellido LIKE LOWER(?) AND LOWER(a.email) LIKE LOWER(?) AND a.celular LIKE LOWER(?) AND a.id_cliente LIKE LOWER(?) order by a.id desc LIMIT ? OFFSET ?', [name, lastname, email, mobile, id_cliente, limit, offset]);

  res.render('links/gestion_usuarios', {
    usuarios,
    query: req.query,
    clientes,
    nombre_cliente
  });
});


router.get('/crear_publicacion', isLoggedIn, async (req, res) => {

  res.render('links/crear_publicacion');

});


router.post('/imagenes_articulo', isLoggedIn, async (req, res) => {

if(req.files){

  //console.log(req.files);

  let archivo = req.files.file;

  let ext = fileExtension(archivo.name);

  let fecha_archivo = moment(Date.now()).format('YYYYMMDD_HHMMSS');

  let formato = "article_"+req.user.id +"_"+fecha_archivo+ "." + ext;

  var full_path = "./src/public/articulos/imagenes/originales/" + formato;



  //Use the mv() method to place the file in upload directory (i.e. "uploads")
  archivo.mv('./src/public/articulos/imagenes/originales/' + formato);

  compress_images(full_path,"./src/public/articulos/imagenes/",
 { compress_force: false, statistic: true, autoupdate: true },
 false,
 { jpg: { engine: "mozjpeg", command: ["-quality", "50"] } },
 { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } },
 { svg: { engine: "svgo", command: "--multipass" } },
 { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
 },
 function (err, completed) {
   if (completed === true) {

     if(err){
       console.log(err);
       res.send({
         "status": 0,
       });
     }else{
       res.send({
         "status": 1,
         "path":"/articulos/imagenes/"+formato
       });
     }



   }else{

     res.send({
       "status": 0,
     });

   }
 });



}else{

  res.send({
    "status": 0,
  });

}
});


router.get('/publicacion/:id', async (req, res) => {

  const {id} = req.params;
  const publicacion = await pool.query('SELECT * FROM publicaciones WHERE id_publicacion=?', id);
  const usuario = await pool.query('SELECT * FROM usuarios WHERE id=?', publicacion[0].id_usuario);

  var visitas = publicacion[0].visitas+1;

  var q_res = await pool.query('UPDATE publicaciones set visitas =? where id_publicacion=?', [visitas, id]);

  res.render('links/ver_publicacion',{publicacion, usuario});

});

router.post('/guardar_publicacion', isLoggedIn, async (req, res) => {

  var data = req.body;
  let newLink = {};

  Object.keys(data).forEach(async function(key) {

        if(!data[key]==""){
          newLink[key] = data[key];
        }

  });


  console.log(newLink.borrador);

  if(newLink.borrador==0){
      let fecha_publicacion = moment(Date.now()).format('YYYY-MM-DD h:mm:ss');
        newLink.fecha_publicacion=fecha_publicacion;
  }

if(req.body.id_publicacion==""){
  newLink.id_usuario=req.user.id;
  var q_res = await pool.query('INSERT INTO publicaciones set ?',  [newLink]);
}else{
  var q_res = await pool.query('UPDATE publicaciones set ? where id_publicacion=?', [newLink, req.body.id_publicacion]);
  q_res.insertId=req.body.id_publicacion;
}


  if (q_res.affectedRows == 0) {
    res.send({
      "status": 0,
      q_res:q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res:q_res
    });
  }

});



router.get('/tipo_de_registro', isLoggedIn, async (req, res) => {

  res.render('links/tipo_de_registro');

});

router.get('/perfil_usuario', isLoggedIn, async (req, res) => {

  if(req.user.es_entrenador==1){
    res.redirect('/links/editar_perfil_entrenador');
  }else if(req.user.es_entrenador==1){
    res.redirect('/links/editar_perfil_cliente');
  }else{
    res.redirect('/');
  }

});

router.get('/editar_perfil_entrenador', isLoggedIn, async (req, res) => {

  const ref_payco = req.query.ref_payco;

  //console.log(ref_payco);

  const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);



  const departamentos = await pool.query('SELECT * FROM departamentos WHERE 1');

  const ciudades = await pool.query('SELECT * FROM ciudades WHERE 1');

  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');

  const niveles_academicos = await pool.query('SELECT * FROM niveles_academicos WHERE 1');

  const soportes_academicos = await pool.query('SELECT * FROM soportes_academicos WHERE id_usuario = ? ', [req.user.id]);

  const categorias_json = JSON.stringify(categorias);

  var info_per=0;
  var info_lab =0;
  var info_cob=0;
  var info_aca=0;
  var info_soc=0;


  if(usuario[0].email && usuario[0].tipo_documento && usuario[0].documento && usuario[0].nick && usuario[0].bio && usuario[0].nombre && usuario[0].apellido && usuario[0].departamento && usuario[0].ciudad && usuario[0].nombre && usuario[0].direccion && usuario[0].celular){
      info_per=1;
  }

  if(usuario[0].categorias && usuario[0].idiomas && usuario[0].idiomas && (usuario[0].virtual || usuario[0].presencial)){
      info_lab=1;
  }

  if(usuario[0].presencial){
    if(usuario[0].cobertura_dir && usuario[0].cobertura_radio && usuario[0].cobertura_lat && usuario[0].cobertura_lng ){
      info_cob=1;
    }else{
      info_cob=0;
    }
  }

  if(soportes_academicos.length){
      info_aca=1;
  }

  if(usuario[0].twitter || usuario[0].facebook || usuario[0].linkedin || usuario[0].linkedin ){
      info_soc=1;
  }

  console.log("personal: "+info_per);
  console.log("laboral: "+info_lab);
  console.log("cobertura: "+info_cob);
  console.log("academico: "+info_aca);
  console.log("social: "+info_soc);



  if (ref_payco) {
    const [respuesta] = await Promise.all([

      superagent.get("https://secure.epayco.co/validation/v1/reference/" + ref_payco)
      .then()
      .catch(err => {
        //console.log(err);
      })
    ]);


    if (respuesta.body.success == true) {

      switch (respuesta.body.data.x_cod_transaction_state) {
        case 1:
          req.flash('success', 'Tu pago ha sido acreditado!');
          res.redirect('/links/perfil_entrenador');
          break;
        case 2:
          req.flash('danger', 'Tu pago ha sido rechazado, intenta de nuevo.');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 3:
          req.flash('warning', 'Tu pago esta pendiente.');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 4:
          req.flash('danger', 'Tu pago ha fallado, intenta de nuevo');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 5:
          req.flash('danger', 'Tu pago ha sido rechazado, intenta de nuevo.');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 6:
          req.flash('warning', 'Tu pago ha sido reversado');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 7:
          req.flash('warning', 'Tu pago ha sido retenido');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 8:
          req.flash('warning', 'Tu pago ha sido iniciado');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 9:
          req.flash('warning', 'Tu pago ha expirado, intenta de nuevo');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 10:
          req.flash('warning', 'Tu pago ha sido abandonado, intenta de nuevo');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 11:
          req.flash('danger', 'Tu pago ha sido cancelado, intenta de nuevo');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        case 12:
          req.flash('warning', 'Tu pago esta en verificación');
          res.redirect('/links/editar_perfil_entrenador');
          break;
        default:
          req.flash('danger', 'Ha ocurrido un error, intenta de nuevo mas tarde');
          res.redirect('/links/editar_perfil_entrenador');
      }


    }else{

      req.flash('danger', 'La pasarela de pagos no responde, intenta más tarde');
      res.redirect('/links/editar_perfil_entrenador');
    }

  } else {

    res.render('links/editar_perfil_entrenador', {usuario,departamentos,categorias,categorias_json,ciudades,niveles_academicos,soportes_academicos,info_per,info_lab,info_cob,info_aca,info_soc});
  }



});


router.get('/editar_perfil_cliente', isLoggedIn, async (req, res) => {


  const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);

  const departamentos = await pool.query('SELECT * FROM departamentos WHERE 1');

  const ciudades = await pool.query('SELECT * FROM ciudades WHERE 1');

  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');

  const categorias_json = JSON.stringify(categorias);

  var info_per=0;
  var info_dis=0;
  var info_sal=0;
  var info_med=0;


  if(usuario[0].email && usuario[0].tipo_documento && usuario[0].documento && usuario[0].nick && usuario[0].nombre && usuario[0].apellido && usuario[0].departamento && usuario[0].ciudad && usuario[0].nombre && usuario[0].direccion && usuario[0].celular && usuario[0].fecha_nacimiento && usuario[0].profesion){
      info_per=1;
  }

  if(usuario[0].horarios_disponibles){
      info_dis=1;
  }

  if(usuario[0].salud_sub_id){
    info_sal=1;
  }

  if(usuario[0].medidas){
      info_med=1;
  }


  console.log("personal: "+info_per);
  console.log("disponibilidad: "+info_dis);
  console.log("salud: "+info_sal);
  console.log("medidas: "+info_med);


    res.render('links/editar_perfil_cliente', {usuario,departamentos,categorias,categorias_json,ciudades,info_per,info_dis,info_sal,info_med});

});



router.get('/perfil_entrenador', isLoggedIn, async (req, res) => {

  const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');
  var user_cats_id=JSON.parse(usuario[0].categorias);
  var user_cats=[];

  user_cats_id.forEach(function(item) {
      categorias.forEach(function(item2) {
            if(item==item2.id){
              user_cats.push(item2.nombre)
            }
      });
  });

var idiomas=JSON.parse(usuario[0].idiomas);

  const pub_intro= await pool.query('SELECT * FROM publicaciones as t1, usuarios as t2 WHERE t1.id_usuario = t2.id AND t1.intro = 1 limit 1');

  pub_intro.forEach(function(item,i) {

    if(item.titulo.length >= 55){
        pub_intro[i].titulo= item.titulo.trim().substring(0, 55)+"..";
    }

    if(item.text_content.length >= 200){
      pub_intro[i].text_content = item.text_content.trim().substring(0, 198)+"..";
    }

  });


  const pubs_usuario = await pool.query('SELECT * FROM publicaciones as t1, usuarios as t2 WHERE t1.id_usuario = t2.id AND t1.destacada = 1 AND t1.id_usuario= ? limit 1', req.user.id);

  const fotos = await pool.query('SELECT * FROM galeria_fotos WHERE id_usuario = ? ', [req.user.id]);

  //console.log(usuario[0].omni_token);
  //const categorias_json = JSON.stringify(categorias);
  res.render('links/perfil_entrenador', {usuario,fotos,pub_intro,pubs_usuario,user_cats,idiomas});

});

router.post('/eliminar_imagen_galeria', isLoggedIn, async (req, res) => {

//console.log(req.body.value);

var q_res=await pool.query('DELETE FROM galeria_fotos where id_foto= ?',  [req.body.value]);

//console.log(q_res);


if (q_res.affectedRows == 1) {
  res.send({
    "status": 1,
    "q_res":q_res,

  });


}else{
  res.send({
    "status": 0,
    "q_res":q_res
  });
}

});


router.post('/agregar_imagen_galeria', isLoggedIn, async (req, res) => {

  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    //console.log(req.files);
    let archivo = req.files.galleryimage;

    let ext = fileExtension(archivo.name);

    let fecha_archivo = moment(Date.now()).format('YYYYMMDD_HHMMSS');

    let formato = "gallery_"+req.user.id +"_"+fecha_archivo+ "." + ext;

    var full_path = "./src/public/galeria_fotos/originales/" + formato;

    var ok=0;


    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/galeria_fotos/originales/' + formato);

    compress_images(full_path,"./src/public/galeria_fotos/",
   { compress_force: false, statistic: true, autoupdate: true },
   false,
   { jpg: { engine: "mozjpeg", command: ["-quality", "70"] } },
   { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } },
   { svg: { engine: "svgo", command: "--multipass" } },
   { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
   },
   function (err, completed) {
     if (completed === true) {

       ok=1;
     }else{
       res.send({
         "status": 0,
       });

     }
   });


 var relative_path="/galeria_fotos/"+ formato;

 const newLink = {
   id_usuario: req.user.id,
   foto:relative_path
 }
 var q_res=await pool.query('INSERT INTO galeria_fotos set ?',  [newLink]);

 try {
     const thumbnail = await imageThumbnail("./src/public/galeria_fotos/"+formato);
     console.log(thumbnail);
 } catch (err) {
     console.error(err);
 }


if (q_res.affectedRows == 1) {
  res.send({
    "status": 1,
    "path":path,
    "q_res":q_res,

  });


}else{
  res.send({
    "status": 0,
    "path":path,
    "q_res":q_res
  });
}


}else{

  res.send({
    "status": 0
  });
}





});

router.post('/actualizar_imagen_cover', isLoggedIn, async (req, res) => {

  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    //console.log(req.files);
    let archivo = req.files.coverimage;

    let ext = fileExtension(archivo.name);

    let formato = "cover_"+req.user.id + "." + ext;

    var full_path = "./src/public/img_profiles/originales/" + formato;

    var ok=0;

    const path4check = "./src/public/img_profiles/"+formato;

    try {
      if (fs.existsSync(path4check)) {
        try {
          fs.unlinkSync("./src/public/img_profiles/"+formato)
          fs.unlinkSync(full_path)
        } catch(err) {
          console.error(err)
        }
      }
    } catch(err) {
      console.error(err)
    }



    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/img_profiles/originales/' + formato);

    compress_images(full_path,"./src/public/img_profiles/",
   { compress_force: false, statistic: true, autoupdate: true },
   false,
   { jpg: { engine: "mozjpeg", command: ["-quality", "70"] } },
   { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } },
   { svg: { engine: "svgo", command: "--multipass" } },
   { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
   },
   function (err, completed) {
     if (completed === true) {

       ok=1;
     }else{
       res.send({
         "status": 0,
       });

     }
   });

 var path="/img_profiles/"+ formato;
 var q_res=await pool.query('UPDATE usuarios set imagen_cover=? where id=?', [path,req.user.id]);

if (q_res.affectedRows == 1) {
  res.send({
    "status": 1,
    "path":path
  });


}else{
  res.send({
    "status": 0,
    "path":path
  });
}


}else{

  res.send({
    "status": 0
  });
}





});


router.post('/actualizar_imagen_perfil', isLoggedIn, async (req, res) => {

  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    //console.log(req.files);
    let archivo = req.files.profileimage;

    let ext = fileExtension(archivo.name);

    let formato = "profile_"+req.user.id + "." + ext;

    var full_path = "./src/public/img_profiles/originales/" + formato;

    var ok=0;

    try {
      fs.unlinkSync("./src/public/img_profiles/"+formato)
      fs.unlinkSync(full_path)
    } catch(err) {
      console.error(err)
    }

    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/img_profiles/originales/' + formato);

    compress_images(full_path,"./src/public/img_profiles/",
   { compress_force: false, statistic: true, autoupdate: true },
   false,
   { jpg: { engine: "mozjpeg", command: ["-quality", "70"] } },
   { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } },
   { svg: { engine: "svgo", command: "--multipass" } },
   { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
   },
   function (err, completed) {
     if (completed === true) {

       ok=1;
     }else{
       res.send({
         "status": 0,
       });

     }
   }
 );

 var path="/img_profiles/"+ formato;
 var q_res=await pool.query('UPDATE usuarios set imagen_perfil=? where id=?', [path,req.user.id]);

if (q_res.affectedRows == 1) {
  res.send({
    "status": 1,
    "path":path
  });


}else{
  res.send({
    "status": 0,
    "path":path
  });
}


}else{

  res.send({
    "status": 0
  });
}





});

router.post('/update_profile', isLoggedIn, async (req, res) => {

  let newLink;

  const {nombre,apellido,contrasena,celular} = req.body;

  if (contrasena) {
    const validPassword = await helpers.encryptPassword(contrasena);

    newLink = {
      nombre,
      apellido,
      celular,
      contrasena: validPassword
    }
  } else {

    newLink = {
      nombre,
      apellido,
      celular
    }

  }

  await pool.query('UPDATE usuarios set ? where id=?', [newLink, req.user.id]);

  req.flash('success', 'Datos actualizados');
  res.redirect('/');

});


router.post('/activar_usuario', isLoggedIn, async (req, res) => {

  const origin = pathExtractor(req);
  const {
    id,
    nombre,
    apellido
  } = req.body;

  await pool.query('UPDATE usuarios set estado=1 where id=?', [id]);

  req.flash('success', nombre + " " + apellido + ' ha sido activado');
  res.redirect(origin);

});


router.post('/desactivar_usuario', isLoggedIn, async (req, res) => {

  const origin = pathExtractor(req);
  const {
    id,
    nombre,
    apellido
  } = req.body;

  await pool.query('UPDATE usuarios set estado=0 where id=?', [id]);

  req.flash('success', nombre + " " + apellido + ' ha sido desactivado');
  res.redirect(origin);

});


router.post('/pago', isLoggedIn, async (req, res) => {
  console.log(req.body);
  const origin = pathExtractor(req);


  req.flash('Test de pago en log');
  res.redirect(origin);

});

router.get('/detalle_usuario/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);

  res.render('links/detalle_usuario', {
    links
  });
});

router.get('/permisos_usuario_cliente/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;

  const id_cliente = id;
  const links = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);


  res.render('links/permisos_usuario_cliente', {
    links,
    id_cliente
  });
});



router.post('/guardar_permisos', async (req, res) => {

  const origin = pathExtractor(req);

  const actuales = await pool.query('SELECT * FROM usuarios WHERE id = ?', req.body.user_id);



  const newLink = {
    admin: req.body.admin || actuales[0].admin,
    admin_cuenta: req.body.admin_cuenta || actuales[0].admin_cuenta,
    realizar_solicitudes: req.body.realizar_solicitudes || actuales[0].realizar_solicitudes,
    consultar_solicitudes: req.body.consultar_solicitudes || actuales[0].consultar_solicitudes,
    ver_informes: req.body.ver_informes || actuales[0].ver_informes,
    gestor_ante: req.body.gestor_ante || actuales[0].gestor_ante,
    gestor_hv: req.body.gestor_hv || actuales[0].gestor_hv,
    gestor_visita: req.body.gestor_visita || actuales[0].gestor_visita,
    gestor_esp: req.body.gestor_esp || actuales[0].gestor_esp,
    gestor_poligrafia: req.body.gestor_poligrafia || actuales[0].gestor_poligrafia
  }



  const q_res = await pool.query('UPDATE usuarios set ? where id=?', [newLink, req.body.user_id]);


  req.flash('success', 'Cambios guardados exitosamente');

  res.redirect('/links/asignar_usuarios/' + req.body.id_cliente);
  //res.redirect(origin);


});


router.post('/registrar_usuario', isLoggedIn, async (req, res) => {

  // estado 0 = sin activar    // estado 1 = registro terminado  //  estado 2 = verificado   //  -1 = desactivado

  var q_res = await pool.query('UPDATE usuarios set estado=1 where id=?', [req.user.id]);

  if (q_res.affectedRows == 0) {

    res.send({
      "status": 0,
      q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res
    });
  }

});


router.post('/guardar_info_horarios_disponibles', isLoggedIn, async (req, res) => {

var calendar_data=JSON.stringify(req.body);

var q_res = await pool.query('UPDATE usuarios set horarios_disponibles=? where id=?', [calendar_data, req.user.id]);

if (q_res.affectedRows == 0) {

  res.send({
    "status": 0,
    q_res
  });

} else {

  res.send({
    "status": 1,
    q_res
  });
}

});


router.post('/guardar_info_social', isLoggedIn, async (req, res) => {


  var data = req.body;
  let newLink = {};

  Object.keys(data).forEach(async function(key) {
    newLink[key] = data[key];
  });

  var q_res = await pool.query('UPDATE usuarios set ? where id=?', [newLink, req.user.id]);

  if (q_res.affectedRows == 0) {

    res.send({
      "status": 0,
      q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res
    });
  }


});




router.post('/guardar_info_personal', isLoggedIn, async (req, res) => {


  var data = req.body;
  let newLink = {};

  console.log(req.body);

  Object.keys(data).forEach(async function(key) {
    newLink[key] = data[key];
  });

  delete newLink["imagen_perfil"];



  const setup = {
    all: {
      path: './src/public/img_profiles/',
      quality: 80
    },
    versions: [{
      prefix: 'big_',
      width: 1024,
      height: 768
    }, {
      prefix: 'medium_',
      width: 512,
      height: 256
    }, {
      quality: 100,
      prefix: 'small_',
      width: 128,
      height: 64
    }]
  };

  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    let archivo = req.files.img_perfil;

    let ext = fileExtension(archivo.name);

    let formato = req.user.id + "." + ext;

    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/img_profiles/originales/' + formato);

    var full_path = "./src/public/img_profiles/originales/" + formato;

    var profile_imgs = await resizer(full_path, setup);

    //console.log(profile_imgs);

    newLink.imagen_perfil = "/img_profiles/medium_" + req.user.id + ".jpg";


  }


  var q_res = await pool.query('UPDATE usuarios set ? where id=?', [newLink, req.user.id]);

  if (q_res.affectedRows == 0) {

    res.send({
      "status": 0,
      q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res
    });
  }

});



router.post('/guardar_info_titulos', isLoggedIn, async (req, res) => {

  const origin = pathExtractor(req);

  var {
    titulo,
    nivel_academico
  } = req.body;

  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    let archivo = req.files.adjunto;

    let ext = fileExtension(archivo.name);

    let fecha_archivo = moment(Date.now()).format('YYYYMMDD_HHMM');

    let formato = fecha_archivo + "_" + req.user.id + "." + ext;

    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/titulos/' + formato);

    //console.log(profile_imgs);
    const newLink = {
      id_usuario: req.user.id,
      titulo,
      id_nivel_academico: nivel_academico,
      adjunto: formato
    }

    var q_res = await pool.query('INSERT INTO soportes_academicos set ? ', [newLink]);

    if (q_res.affectedRows == 0) {

      res.send({
        "status": 0,
        q_res
      });

    } else {

      res.send({
        "status": 1,
        q_res
      });
    }

  } else {

    res.send({
      "status": 0
    });
  }




});


router.post('/guardar_info_runef', isLoggedIn, async (req, res) => {

  const origin = pathExtractor(req);

  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    let archivo = req.files.adjunto_runef;

    let ext = fileExtension(archivo.name);

    let fecha_archivo = moment(Date.now()).format('YYYYMMDD_HHMM');

    let formato = fecha_archivo + "_runef_" + req.user.id + "." + ext;

    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/titulos/' + formato);

    //console.log(profile_imgs);
    const newLink = {
      id_usuario: req.user.id,
      es_runef: 1,
      titulo: "Registro único del educador físico (RUN-EF)",
      adjunto: formato
    }

    var q_res = await pool.query('INSERT INTO soportes_academicos set ? ', [newLink]);

    if (q_res.affectedRows == 0) {

      res.send({
        "status": 0,
        q_res
      });

    } else {

      res.send({
        "status": 1,
        q_res
      });
    }

  } else {

    res.send({
      "status": 0
    });
  }


});


router.post('/guardar_info_cobertura', isLoggedIn, async (req, res) => {

  const origin = pathExtractor(req);

  var {
    cobertura_dir,
    cobertura_radio,
    cobertura_ciudad,
    cobertura_barrio,
    cobertura_lat,
    cobertura_lng
  } = req.body;


  const newLink = {
    cobertura_dir,
    cobertura_radio,
    cobertura_lat,
    cobertura_lng
  }

  //console.log(newLink);


  var q_res = await pool.query('UPDATE usuarios set ? where id=?', [newLink, req.user.id]);

  if (q_res.affectedRows == 0) {

    res.send({
      "status": 0,
      q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res
    });
  }

});

router.post('/guardar_info_laboral', isLoggedIn, async (req, res) => {


  var {
    categorias,
    sub_categorias,
    idiomas,
    virtual,
    presencial
  } = req.body;

  categorias = JSON.stringify(categorias);

  sub_categorias = JSON.stringify(sub_categorias);

  idiomas = JSON.stringify(idiomas);


  const newLink = {
    categorias,
    sub_categorias,
    idiomas,
    virtual,
    presencial

  }

  var q_res = await pool.query('UPDATE usuarios set ? where id=?', [newLink, req.user.id]);

  if (q_res.affectedRows == 0) {

    res.send({
      "status": 0,
      q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res
    });
  }

});


router.post('/guardar_tipo_usuario', isLoggedIn, async (req, res) => {

  var { es_cliente,es_entrenador } = req.body;

  var q_res;
  if(es_entrenador == 1){
    q_res = await pool.query('UPDATE usuarios set es_entrenador=1 where id=?', [req.user.id]);
    req.user.es_entrenador=1;
  }

  if(es_cliente == 1){
    q_res = await pool.query('UPDATE usuarios set es_cliente=1 where id=?', [req.user.id]);
    req.user.es_cliente=1;
  }


  if (q_res.affectedRows == 0) {

    res.send({
      "status": 0,
      q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res
    });
  }

});



router.post('/guardar_usuario', async (req, res) => {


  var data = req.body;
  let newLink = {};


  Object.keys(data).forEach(async function(key) {
    newLink[key] = data[key];
  });


  const setup = {
    all: {
      path: './src/public/img_profiles/',
      quality: 80
    },
    versions: [{
      prefix: 'big_',
      width: 1024,
      height: 768
    }, {
      prefix: 'medium_',
      width: 512,
      height: 256
    }, {
      quality: 100,
      prefix: 'small_',
      width: 128,
      height: 64
    }]
  };

  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    let archivo = req.files.img_perfil;

    let ext = fileExtension(archivo.name);

    let formato = req.user.id + "." + ext;

    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/img_profiles/originales/' + formato);

    var full_path = "./src/public/img_profiles/originales/" + formato;

    var profile_imgs = await resizer(full_path, setup);

    //console.log(profile_imgs);

    newLink.imagen_perfil = "/img_profiles/medium_" + req.user.id + ".jpg";

  }

  q_res = await pool.query('UPDATE usuarios set ? where id=?', [newLink, req.user.id]);

  if (q_res.affectedRows == 0) {

    res.send({
      "status": 0,
      q_res
    });

  } else {

    res.send({
      "status": 1,
      q_res
    });


  }

});


/////////////////////////////////////FIND DE USER MNG//////////////////////////////////////



////////////////////////////////////////CLIENT MNG////////////////////////////////////////////
router.get('/gestion_clientes', isLoggedIn, async (req, res) => {

  const razon_social = req.query.razon_social || "%";
  const nit = req.query.nit || "%";
  const email = req.query.email || "%";
  const telefono = req.query.telefono || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const clientes = await pool.query('SELECT * FROM clientes WHERE LOWER(razon_social) LIKE LOWER(?) AND nit LIKE LOWER(?) AND LOWER(email) LIKE LOWER(?) AND telefono LIKE LOWER(?) order by id desc LIMIT ? OFFSET ?', [razon_social, nit, email, telefono, limit, offset]);

  res.render('links/gestion_clientes', {
    clientes,
    query: req.query
  });
});



router.get('/detalle_cliente/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;

  const clientes = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);

  const usuarios = await pool.query('SELECT * FROM usuarios WHERE id_cliente = ?', [id]);


  res.render('links/detalle_cliente', {
    clientes,
    usuarios
  });
});

router.get('/nuevo_cliente', isLoggedIn, async (req, res) => {


  res.render('links/nuevo_cliente');
});



router.post('/guardar_cliente', async (req, res) => {


  const {
    razon_social,
    nit,
    telefono,
    direccion,
    email,
    departamento,
    ciudad
  } = req.body;

  const cliente = {
    razon_social,
    nit,
    telefono,
    direccion,
    email,
    departamento,
    ciudad
  };

  const q_res = await pool.query('INSERT INTO clientes set ?', [cliente]);

  req.flash('success', 'Nuevo cliente creado correctamente');
  res.redirect('/links/asignar_usuarios/' + q_res.insertId);


});

router.get('/asignar_usuarios/:id', isLoggedIn, async (req, res) => {

  const {
    id
  } = req.params;

  const name = req.query.name || "%";
  const lastname = req.query.lastname || "%";
  const email = req.query.email || "%";
  const mobile = req.query.mobile || "%";

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const clientes = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);

  const usuarios_asignados = await pool.query('SELECT * FROM usuarios WHERE id_cliente = ?', [id]);

  const usuarios_no_asignados = await pool.query('SELECT * FROM usuarios WHERE id_cliente IS NULL AND admin=0 AND LOWER(nombre) LIKE LOWER(?) AND apellido LIKE LOWER(?) AND LOWER(email) LIKE LOWER(?) AND celular LIKE LOWER(?) order by id desc LIMIT ? OFFSET ?', [name, lastname, email, mobile, limit, offset]);

  //  console.log(clientes);

  res.render('links/asignar_usuarios', {
    clientes,
    usuarios_asignados,
    usuarios_no_asignados,
    query: req.query
  });
});

router.post('/retirar_usuario', async (req, res) => {


  const {
    id,
    id_cliente,
    nombre,
    apellido
  } = req.body;

  await pool.query('UPDATE usuarios set id_cliente = NULL where id=?', [id]);

  req.flash('success', nombre + " " + apellido + ' retirad@ correctamente');
  res.redirect('/links/asignar_usuarios/' + id_cliente);


});

router.post('/asignar_usuario', async (req, res) => {


  const {
    id,
    id_cliente,
    nombre,
    apellido
  } = req.body;

  await pool.query('UPDATE usuarios set id_cliente = ? where id=?', [id_cliente, id]);

  req.flash('success', nombre + " " + apellido + ' asignad@ correctamente');
  res.redirect('/links/asignar_usuarios/' + id_cliente);


});



/////////////////////////////////////FIND DE CLIENT MNG//////////////////////////////////////




////////////////////////////////////////CATEGORIES MNG////////////////////////////////////////////


router.get('/gestion_categorias', isLoggedIn, async (req, res) => {

  let nombre = req.query.nombre || "%";
  nombre = "%" + nombre + "%";
  let descripcion = req.descripcion || "%";
  descripcion = "%" + descripcion + "%";


  const categorias = await pool.query('SELECT * FROM categorias WHERE LOWER(nombre) LIKE LOWER(?) AND LOWER(descripcion) LIKE LOWER(?)  order by id desc ', [nombre, descripcion]);

  //console.log(categorias);
  res.render('links/gestion_categorias', {
    categorias,
    query: req.query
  });
});



router.get('/editar_categoria/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;

  const categoria = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);

  res.render('links/editar_categoria', {
    categoria
  });
});

router.get('/agregar_categoria', isLoggedIn, async (req, res) => {

  res.render('links/agregar_categoria');
});



router.post('/guardar_categoria', async (req, res) => {

  const {
    nombre,
    descripcion,
    id
  } = req.body;


  if (id) {


    const q_res = await pool.query('UPDATE categorias set nombre = ?, descripcion = ? where id=?', [nombre, descripcion, id]);

    req.flash('success', 'Categoría actualizada corractamente');
    res.redirect('/links/gestion_categorias');

  } else {

    const categoria = {
      nombre,
      descripcion
    };

    const q_res = await pool.query('INSERT INTO categorias set ?', [categoria]);

    req.flash('success', 'Nuevo categoría agregada correctamente');
    res.redirect('/links/gestion_categorias');

  }




});


/////////////////////////////////////FIND DE CATEGORIES MNG//////////////////////////////////////




////////////////////////////////////////FORMATOS MNG////////////////////////////////////////////


router.get('/gestion_formatos', isLoggedIn, async (req, res) => {

  let nombre = req.query.nombre || "%";
  nombre = "%" + nombre + "%";
  let descripcion = req.query.descripcion || "%";
  descripcion = "%" + descripcion + "%";
  const id_categoria = req.query.id_categoria || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  //  console.log(nombre);


  const formatos = await pool.query('SELECT t1.id,t1.nombre,t1.descripcion, t2.nombre as nombre_categoria,t2.id as id_categoria  FROM formatos as t1, categorias as t2 WHERE  t1.categoria = t2.id AND LOWER(t1.nombre) LIKE LOWER(?) AND LOWER(t1.descripcion) LIKE LOWER(?) AND t2.id LIKE ?  order by t1.id desc  ', [nombre, descripcion, id_categoria]);

  //const formatos = await pool.query('SELECT t1.id,t1.nombre,t1.descripcion, t2.nombre as nombre_categoria,t2.id as id_categoria  FROM formatos as t1, categorias as t2 WHERE  t1.categoria = t2.id AND LOWER(t1.nombre) LIKE LOWER(?) AND LOWER(t1.descripcion) LIKE LOWER(?) AND t2.id LIKE ?  order by t1.id desc',[nombre,descripcion,id_categoria]);

  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');

  //console.log(categorias);
  res.render('links/gestion_formatos', {
    formatos,
    query: req.query,
    categorias,
    page
  });
});



router.get('/editar_formato/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;

  const formato = await pool.query('SELECT t1.id,t1.nombre,t1.descripcion,t1.pdf as pdf,t1.html as html,t1.js as js,t1.costo_pdf as costo_pdf,t1.costo_editable as costo_editable,t1.costo_asesoria as costo_asesoria, t2.nombre as nombre_categoria,t2.id as id_categoria  FROM formatos as t1, categorias as t2 WHERE t1.categoria = t2.id AND t1.id = ? ', [id]);


  //console.log(formato);
  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');



  res.render('links/editar_formato', {
    formato,
    categorias,
    html: formato[0].html,
    js: formato[0].js
  });
});

router.get('/agregar_formato', isLoggedIn, async (req, res) => {

  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');

  res.render('links/agregar_formato', {
    categorias
  });
});





router.post('/guardar_formato', async (req, res) => {

  const {
    nombre,
    descripcion,
    id_categoria,
    id,
    html,
    js,
    costo_pdf,
    costo_editable,
    costo_asesoria
  } = req.body;
  //console.log(req.body);



  let javas = he.decode(js);

  let html2 = he.decode(html);



  encoded_html = encodeURIComponent(html);

  encoded_js = encodeURIComponent(javas);




  if (id) { //////////   si ya existe (actualizar)

    const archivo_html = "./src/public/formatos/no_" + id + ".html";

    const archivo_js = "./src/public/formatos/no_" + id + ".js";


    if (req.files) {

      let archivo = req.files.adjunto_pdf;

      console.log(archivo);
      //let fecha_archivo=moment(Date.now()).format('YYYYMMDD_HHMM');

      let ext = fileExtension(archivo.name);

      let nombre_archivo = "formato_no_" + id + "." + ext;

      //Use the mv() method to place the file in upload directory (i.e. "uploads")
      archivo.mv('./src/public/formatos_pdf/' + nombre_archivo);


      const q_res = await pool.query('UPDATE formatos set nombre = ?, descripcion = ?, categoria = ?,pdf =?, html = ?, js=?,costo_pdf=?,costo_editable=?,costo_asesoria=? where id=?', [nombre, descripcion, id_categoria, nombre_archivo, encoded_html, encoded_js, costo_pdf, costo_editable, costo_asesoria, id]);

      guardar(archivo_html, html2).then(() => {
        console.log('HTML guardado')
      })

      guardar(archivo_js, javas).then(() => {
        console.log('JS guardado')
      })

      req.flash('success', 'Formato actualizado agregado correctamente');
      res.redirect('/links/gestion_formatos');


    } else {

      guardar(archivo_html, html2).then(() => {
        console.log('HTML guardado')
      })

      guardar(archivo_js, javas).then(() => {
        console.log('JS guardado')
      })


      const q_res = await pool.query('UPDATE formatos set nombre = ?, descripcion = ?, categoria = ?,html = ?, js=?,costo_pdf=?,costo_editable=?,costo_asesoria=? where id=?', [nombre, descripcion, id_categoria, encoded_html, encoded_js, costo_pdf, costo_editable, costo_asesoria, id]);

      req.flash('success', 'Formato actualizado agregado correctamente');
      res.redirect('/links/gestion_formatos');


    }


  } else { //////////   si no existe (crear)



    if (req.files) {

      const formato = {
        nombre,
        descripcion,
        categoria: id_categoria,
        html: encoded_html,
        js: encoded_js,
        costo_pdf,
        costo_editable,
        costo_asesoria
      };

      let q_res = await pool.query('INSERT INTO formatos set ?', [formato]);

      let archivo = req.files.adjunto_pdf;

      //console.log(req.files);
      //let fecha_archivo=moment(Date.now()).format('YYYYMMDD_HHMM');

      // returns
      let ext = fileExtension(archivo.name);

      let nombre_archivo = "formato_no_" + q_res.insertId + "." + ext;

      //Use the mv() method to place the file in upload directory (i.e. "uploads")
      archivo.mv('./src/public/formatos_pdf/' + nombre_archivo);

      const archivo_html = "./src/public/formatos/no_" + q_res.insertId + ".html";

      const archivo_js = "./src/public/formatos/no_" + q_res.insertId + ".js";


      guardar(archivo_html, html2).then(() => {
        console.log('HTML guardado')
      })

      guardar(archivo_js, javas).then(() => {
        console.log('JS guardado')
      })


      q_res = await pool.query('UPDATE formatos set pdf = ? where id=?', [nombre_archivo, q_res.insertId]);



      req.flash('success', 'Nuevo formato agregado correctamente');
      res.redirect('/links/gestion_formatos');


    } else {



      const formato = {
        nombre,
        descripcion,
        categoria: id_categoria,
        html: encoded_html,
        js: encoded_js,
        costo_pdf,
        costo_editable,
        costo_asesoria
      };


      const q_res = await pool.query('INSERT INTO formatos set ?', [formato]);


      const archivo_html = "./src/public/formatos/no_" + q_res.insertId + ".html";

      const archivo_js = "./src/public/formatos/no_" + q_res.insertId + ".js";


      guardar(archivo_html, html2).then(() => {
        console.log('HTML guardado')
      })

      guardar(archivo_js, javas).then(() => {
        console.log('JS guardado')
      })


      req.flash('success', 'Nuevo formato agregado correctamente');
      res.redirect('/links/gestion_formatos');

    }

  }

});



router.get('/usar_formato/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;

  //console.log(formato);
  const formato = await pool.query('SELECT html,js FROM formatos WHERE id=?', [id]);

  //console.log(formato);

  res.render('links/usar_formato', {
    html: formato[0].html,
    js: formato[0].js,
    id
  });

  //console.log(data);
});




router.get('/opciones_documento/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;

  const formato = await pool.query('SELECT t1.id,t1.nombre,t1.descripcion,t1.pdf as pdf,t1.html as html,t1.js as js,t1.costo_pdf as costo_pdf,t1.costo_editable as costo_editable,t1.costo_asesoria as costo_asesoria, t2.nombre as nombre_categoria,t2.id as id_categoria  FROM formatos as t1, categorias as t2 WHERE t1.categoria = t2.id AND t1.id = ? ', [id]);

  //console.log(formato);

  res.render('links/opciones_documento', {
    id: formato[0].id,
    pdf: formato[0].pdf,
    html: formato[0].html,
    nombre_formato: formato[0].nombre,
    costo_pdf: formato[0].costo_pdf,
    costo_editable: formato[0].costo_editable,
    costo_asesoria: formato[0].costo_asesoria,
    nombre_cliente: req.user.nombre,
    apellido_cliente: req.user.apellido,
    email_cliente: req.user.email,
    documento: req.user.documento
  });
});




/////////////////////////////////////FIN DE FORMATOS MNG////////////////////////////////////////////




/////////////////////////////////////INICIO DE PAGOS  ///////////////////////////////////////////////////



router.post('/agregar_cobro', async (req, res) => {

  const {
    id_documento,
    tipo_venta
  } = req.body;

  const formato = await pool.query('SELECT nombre,costo_pdf,costo_asesoria,costo_editable FROM formatos WHERE id=?', [id_documento]);

  const cliente = await pool.query('SELECT nombre, apellido, tipo_id,documento,email,celular FROM usuarios WHERE id=?', [req.user.id]);

  var costo;
  var total_con_iva;
  var iva;
  var concepto;



  if (tipo_venta == "pdf") {
    costo = formato[0].costo_pdf;
    iva = formato[0].costo_pdf * 0.19;
    total_con_iva = formato[0].costo_pdf + (formato[0].costo_pdf * 0.19);
    concepto = formato[0].nombre;

    if (concepto.length > 62) {
      concepto = str.substr(1, 62);
    }
    concepto = concepto + " (PDF)";

  }

  if (tipo_venta == "pdf_asistido") {
    costo = formato[0].costo_editable;
    iva = formato[0].costo_editable * 0.19;
    total_con_iva = formato[0].costo_editable + (formato[0].costo_editable * 0.19);
    concepto = formato[0].nombre;
    if (concepto.length > 54) {
      concepto = str.substr(1, 54);
    }
    concepto = concepto + " (PDF_asistido)";
  }

  if (tipo_venta == "asesoria") {
    costo = formato[0].costo_asesoria;
    iva = formato[0].costo_asesoria * 0.19;
    total_con_iva = formato[0].costo_asesoria + (formato[0].costo_asesoria * 0.19);
    concepto = formato[0].nombre;

    if (concepto.length > 58) {
      concepto = str.substr(1, 58);
    }
    concepto = concepto + " (Asesoria)";
  }



  const cobro = {
    nombre: cliente[0].nombre,
    apellido: cliente[0].apellido,
    tipo_id: cliente[0].tipo_id,
    documento: cliente[0].documento,
    email: cliente[0].email,
    celular: cliente[0].celular,
    concepto,
    tipo_venta,
    id_documento,
    costo,
    iva,
    total_con_iva
  };


  const q_res = await pool.query('INSERT INTO transacciones set ?', [cobro]);


  //console.log(json);

  var json = {
    "InformacionPago": {
      "flt_total_con_iva": total_con_iva,
      "flt_valor_iva": iva,
      "str_id_pago": String(q_res.insertId),
      "str_descripcion_pago": String(concepto),
      "str_email": String(cliente[0].email),
      "str_id_cliente": String(cliente[0].documento),
      "str_tipo_id": String(cliente[0].tipo_id),
      "str_nombre_cliente": String(cliente[0].nombre),
      "str_apellido_cliente": String(cliente[0].apellido),
      "str_telefono_cliente": String(cliente[0].celular),
      "str_opcional1": "",
      "str_opcional2": "",
      "str_opcional3": "",
      "str_opcional4": "",
      "str_opcional5": ""
    },
    "InformacionSeguridad": {
      "int_id_comercio": 28454,
      "str_usuario": "Yolitigo28454",
      "str_clave": "Yolitigo28454*",
      "int_modalidad": 1
    },
    "AdicionalesPago": [{
      "int_codigo": 111,
      "str_valor": "1"
    }, {
      "int_codigo": 112,
      "str_valor": "0"
    }],
    "AdicionalesConfiguracion": [{
      "int_codigo": 50,
      "str_valor": "2701"
    }, {
      "int_codigo": 100,
      "str_valor": "2"
    }, {
      "int_codigo": 101,
      "str_valor": "0"
    }, {
      "int_codigo": 102,
      "str_valor": "0"
    }, {
      "int_codigo": 103,
      "str_valor": "0"
    }, {
      "int_codigo": 104,
      "str_valor": "https://panel.yolitigo.co/links/mis_documentos"
    }, {
      "int_codigo": 105,
      "str_valor": "5000"
    }, {
      "int_codigo": 106,
      "str_valor": "3"
    }, {
      "int_codigo": 107,
      "str_valor": "0"
    }, {
      "int_codigo": 108,
      "str_valor": "0"
    }, {
      "int_codigo": 109,
      "str_valor": "0"
    }, {
      "int_codigo": 110,
      "str_valor": "0"
    }, {
      "int_codigo": 113,
      "str_valor": "0"
    }, {
      "int_codigo": 114,
      "str_valor": "0"
    }, {
      "int_codigo": 115,
      "str_valor": "0"
    }]
  };


  const [respuesta] = await Promise.all([
    superagent.post('https://www.zonapagos.com/Apis_CicloPago/api/InicioPago')
    .set('Content-Type', 'application/json')
    .send(json)
    .then()
    .catch()
  ]);



  var json_response = JSON.parse(respuesta.text);

  // console.log(json_response.str_url);




  if (json_response.int_codigo == 1) {
    console.log("link ok");
    await pool.query('UPDATE transacciones set estado = ?,link_pago= ?, user_id=? where id=?', ["cobro_generado", json_response.str_url, req.user.id, q_res.insertId]);

    //const documentos = await pool.query('SELECT * FROM transacciones WHERE user_id=?',req.user.id);

    req.flash('success', 'Cobro generado');
    res.render('links/resumen_cobro', {
      link_pago: json_response.str_url,
      nombre: req.user.nombre,
      apellido: req.user.apellido,
      documento: req.user.documento,
      email: req.user.email,
      nombre: req.user.nombre,
      concepto,
      costo,
      iva,
      total_con_iva,
      id_transaccion: q_res.insertId
    });


  } else {

    console.log("error generando pago");
    await pool.query('UPDATE transacciones set estado = ?, user_id=? where id=?', ["problema_generando_link", req.user.id, q_res.insertId]);

    const documentos = await pool.query('SELECT * FROM transacciones  WHERE user_id=?', req.user.id);

    req.flash('success', 'No se pudo generar el cobro, intente de nuevo');
    res.render('links/resumen_cobro', {
      problema: 1,
      id_transaccion: q_res.insertId
    });
  }


});

router.get('/monitor_pagos', async (req, res) => {

  var pasadas_24 = moment().subtract(24, "hours").format("YYYY-MM-DD HH:mm:ss");

  const transacciones_pasadas = await pool.query('SELECT * FROM transacciones WHERE estado !=? AND fecha_creacion < ? ', ["ok", pasadas_24]);

  for await (const transaccion of transacciones_pasadas) {
    await pool.query('UPDATE transacciones set estado = ? where id=?', ["rechazado", transaccion.id]);
  }

  const transacciones_nuevas = await pool.query('SELECT * FROM transacciones WHERE estado !=? AND fecha_creacion > ? ', ["ok", pasadas_24]);

  for await (const transaccion of transacciones_nuevas) {

    const [respuesta] = await Promise.all([

      superagent.get("https://panel.yolitigo.co/links/verificar_pago/" + transaccion.id)
      .then()
      .catch(err => {
        //console.log(err);
      })
    ]);
    //console.log(respuesta.text);
  }

  res.send("ok");


});


router.get('/verificar_pago/:id', async (req, res) => {
  const {
    id
  } = req.params;

  var json = {
    "int_id_comercio": 28454,
    "str_usr_comercio": "Yolitigo28454",
    "str_pwd_Comercio": "Yolitigo28454*",
    "str_id_pago": String(id),
    "int_no_pago": -1
  }

  const [respuesta] = await Promise.all([
    superagent.post('https://www.zonapagos.com/Apis_CicloPago/api/VerificacionPago')
    .set('Content-Type', 'application/json')
    .send(json)
    .then()
    .catch()
  ]);

  if (respuesta.body.int_error == 0) {

    var intentos = String(respuesta.body.str_res_pago).split(";");

    delete intentos[intentos.length - 1];

    intentos = intentos.filter(item => item);

    var estado_no;

    var estado;


    intentos.forEach(function(key) {

      var intento_data = String(key).split("|");

      delete intento_data[intento_data.length - 1];

      intento_data = intento_data.filter(item => item);

      estado_no = String(intento_data[4]).trim();

      var fecha_registro = deco_date_pagos(intento_data[19]);

      //console.log(estado_no);

      if (estado_no == "1") {
        estado = "ok";

        pool.query('UPDATE transacciones set estado = ?, fecha_registro=? where id=?', [estado, fecha_registro, id]);

        //console.log("Pago OK");

      } else if (estado_no == "1000" | estado_no == "1001" | estado_no == "4000" | estado_no == "777") {

        estado = "rechazado";
        pool.query('UPDATE transacciones set estado = ?, fecha_registro=? where id=?', [estado, fecha_registro, id]);

        //console.log("Pago rechazado");

      } else if (estado_no == "200" | estado_no == "888" | estado_no == "999" | estado_no == "4001" | estado_no == "1002") {
        estado = "en_proceso";
        pool.query('UPDATE transacciones set estado = ?, fecha_registro=? where id=?', [estado, fecha_registro, id]);

        //console.log("Pago en proceso");

      } else {
        estado = "error";
        pool.query('UPDATE transacciones set estado = ?, fecha_registro=? where id=?', [estado, fecha_registro, id]);

        //console.log("error");
      }

    });


  } else {
    console.log("pago no encontrado");
  }

  estado = {
    "estado": estado,
    "codigo": estado_no
  };
  console.log(estado);
  res.send(estado);
});



router.get('/intento_pago/:id', isLoggedIn, async (req, res) => {

  const {
    id
  } = req.params;

  const transaccion = await pool.query('SELECT * FROM transacciones WHERE id=?', [id]);


  if (transaccion[0].estado == "ok") {

    res.redirect('/links/mis_documentos')

  } else {

    var json = {
      "InformacionPago": {
        "flt_total_con_iva": transaccion[0].total_con_iva,
        "flt_valor_iva": transaccion[0].iva,
        "str_id_pago": String(transaccion[0].id),
        "str_descripcion_pago": String(transaccion[0].concepto),
        "str_email": String(transaccion[0].email),
        "str_id_cliente": String(transaccion[0].documento),
        "str_tipo_id": String(transaccion[0].tipo_id),
        "str_nombre_cliente": String(transaccion[0].nombre),
        "str_apellido_cliente": String(transaccion[0].apellido),
        "str_telefono_cliente": String(transaccion[0].celular),
        "str_opcional1": "",
        "str_opcional2": "",
        "str_opcional3": "",
        "str_opcional4": "",
        "str_opcional5": ""
      },
      "InformacionSeguridad": {
        "int_id_comercio": 28454,
        "str_usuario": "Yolitigo28454",
        "str_clave": "Yolitigo28454*",
        "int_modalidad": 1
      },
      "AdicionalesPago": [{
        "int_codigo": 111,
        "str_valor": "1"
      }, {
        "int_codigo": 112,
        "str_valor": "0"
      }],
      "AdicionalesConfiguracion": [{
        "int_codigo": 50,
        "str_valor": "2701"
      }, {
        "int_codigo": 100,
        "str_valor": "2"
      }, {
        "int_codigo": 101,
        "str_valor": "0"
      }, {
        "int_codigo": 102,
        "str_valor": "0"
      }, {
        "int_codigo": 103,
        "str_valor": "0"
      }, {
        "int_codigo": 104,
        "str_valor": "https://panel.yolitigo.co/links/mis_documentos"
      }, {
        "int_codigo": 105,
        "str_valor": "5000"
      }, {
        "int_codigo": 106,
        "str_valor": "3"
      }, {
        "int_codigo": 107,
        "str_valor": "0"
      }, {
        "int_codigo": 108,
        "str_valor": "0"
      }, {
        "int_codigo": 109,
        "str_valor": "0"
      }, {
        "int_codigo": 110,
        "str_valor": "0"
      }, {
        "int_codigo": 113,
        "str_valor": "0"
      }, {
        "int_codigo": 114,
        "str_valor": "0"
      }, {
        "int_codigo": 115,
        "str_valor": "0"
      }]
    };


    const [respuesta] = await Promise.all([
      superagent.post('https://www.zonapagos.com/Apis_CicloPago/api/InicioPago')
      .set('Content-Type', 'application/json')
      .send(json)
      .then()
      .catch()
    ]);



    var json_response = JSON.parse(respuesta.text);

    console.log(json_response);

    let hoy = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');




    if (json_response.int_codigo == 1) {
      console.log("link ok");
      await pool.query('UPDATE transacciones set estado = ?,link_pago= ?,fecha_creacion=?, user_id=? where id=?', ["cobro_generado", json_response.str_url, hoy, req.user.id, transaccion[0].id]);

      //const documentos = await pool.query('SELECT * FROM transacciones WHERE user_id=?',req.user.id);

      req.flash('success', 'Cobro generado');
      res.render('links/resumen_cobro', {
        link_pago: json_response.str_url,
        nombre: req.user.nombre,
        apellido: req.user.apellido,
        documento: req.user.documento,
        email: req.user.email,
        nombre: req.user.nombre,
        concepto: transaccion[0].concepto,
        costo: transaccion[0].costo,
        iva: transaccion[0].iva,
        total_con_iva: transaccion[0].total_con_iva,
        id_transaccion: transaccion[0].id
      });

    } else {

      console.log("error generando pago");
      await pool.query('UPDATE transacciones set estado = ?, user_id=? where id=?', ["problema_generando_link", req.user.id, transaccion[0].id]);

      const documentos = await pool.query('SELECT * FROM transacciones  WHERE user_id=?', req.user.id);

      req.flash('success', 'No se pudo generar el cobro, intente de nuevo');
      res.render('links/resumen_cobro', {
        problema: 1,
        id_transaccion: transaccion[0].id
      });
    }


  }



});



/////////////////////////////////////FIN DE PAGOS  ////////////////////////////////////////////////////



/////////////////////////////////////INICIO DE ASESORIAS  ////////////////////////////////////////////////////




router.post('/agregar_asesoria', isLoggedIn, async (req, res) => {
  const {
    id_documento,
    id_categoria
  } = req.body;

  const asesoria = {
    id_documento,
    id_categoria,
    id_usuario: req.user.id
  };

  const q_res = await pool.query('INSERT INTO asesorias set ?', [asesoria]);

  req.flash('success', 'Cobro generado');
  res.render('links/buscar_asesor', {});

});



router.get('/buscar_asesor', isLoggedIn, (req, res) => {


  req.flash('success', 'Buscando asesor..');
  res.render('links/buscar_asesor', {});

});





/////////////////////////////////////FIN DE ASESORIAS  ////////////////////////////////////////////////////



router.get('/ocr', isLoggedIn, (req, res) => {
  res.render('links/ocr');
});



////////////////////////////////// NUEVA SOLICITUD/////////////////////////////////////////

router.get('/nueva_tutela_salud', isLoggedIn, (req, res) => {
  res.render('links/nueva_tutela_salud');
});

router.get('/nueva_tutela_general', isLoggedIn, (req, res) => {
  res.render('links/nueva_tutela_general');
});

router.get('/nuevo_estudio_visita', isLoggedIn, (req, res) => {
  res.render('links/nuevo_estudio_visita');
});

router.get('/nuevo_estudio_esp', isLoggedIn, (req, res) => {
  res.render('links/nuevo_estudio_esp');
});

router.get('/nuevo_estudio_poligrafia', isLoggedIn, (req, res) => {
  res.render('links/nuevo_estudio_poligrafia');
});


/////////////////////////////////////FIN DE NUEVA SOLICITUD/////////////////////////////////////

//////////////////////////////////////OCR //////////////////////////////////////////////////////

router.post('/ocr', async (req, res) => {

  const config = {
    lang: "spa",
    oem: 1,
    psm: 3,
  }

  console.log(req.files);
  let archivo = req.files.archivo;

  //console.log(req.files);
  let fecha_archivo = moment(Date.now()).format('YYYYMMDD_HHMM');

  // returns
  let ext = fileExtension(archivo.name);

  let formato = "ocr_" + fecha_archivo + "." + ext;

  //Use the mv() method to place the file in upload directory (i.e. "uploads")
  archivo.mv('./src/public/ocr/' + formato);

  let full_path = "./src/public/ocr/" + formato;



  tesseract.recognize(full_path, config)
    .then(text => {
      //  console.log("Result:", text);
      res.send(text);
    })
    .catch(error => {
      //console.log(error.message)
      res.send(text);
    })

});

//////////////////////////////////////FIN OCR //////////////////////////////////////////////////////

///////////////////////////////////////ESTUDIOS ANTECEDENTES//////////////////////////////////////

router.post('/nuevo_estudio_antecedentes', async (req, res) => {

  const {
    tipo,
    nombre,
    cedula,
    referencia,
    nota
  } = req.body;

  const newLink = {
    tipo,
    nombre,
    cedula,
    referencia,
    nota_cliente: nota,
    user_id: req.user.id,
    id_cliente: req.user.id_cliente
  };
  const q_res = await pool.query('INSERT INTO estudios_antecedentes set ?', [newLink]);
  //console.log(req.body);

  // ---------------------NOTICACION A USUARIO-------------------------------//
  let asunto = "Solicitud de estudio de antecedentes #" + q_res.insertId + " recibida";
  let msg_txt = "Usted ha enviado una nueva solicitud de estudio de antecedentes. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_antecedente/" + q_res.insertId;
  let msg_html = "<b>Usted ha enviado una nueva solicitud de estudio de antecedentes: </b> <br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_antecedente/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

  const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
  mail2(usuario[0].email, asunto, msg_txt, msg_html);

  // ---------------------FIN NOTICACION A USUARIO-------------------------------//



  // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
  let asunto1 = "Solicitud de estudio de antecedentes #" + q_res.insertId + " recibida";
  let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de estudio de antecedentes. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_antecedente/" + q_res.insertId;
  let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de estudio de antecedentes: </b> <br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_antecedente/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles.";

  const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

  admins_cuenta.forEach(function(item) {
    mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
  });

  // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//



  // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
  const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_ante = 1');

  let asunto2 = "Nueva solicitud de antecedentes #" + q_res.insertId + " recibida";
  let msg_txt2 = "Se ha recibido una nueva solicitud de estudio de antecedentes. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_antecedente/" + q_res.insertId;
  let msg_html2 = "<b>Se ha recibido una nueva solicitud de estudio de antecedentes. </b><br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_antecedente/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

  coordinadores.forEach(function(item) {
    mail2(item.email, asunto2, msg_txt2, msg_html2);
  });

  // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//



  req.flash('success', 'Su solicitud ha sido creada con el id: ' + q_res.insertId);
  res.redirect('/links/consulta_antecedentes');

  //res.send('Recibido');
  //  res.render('links/new');
});

router.get('/mis_documentos', isLoggedIn, async (req, res) => {

  var documentos = await pool.query('SELECT * FROM transacciones WHERE user_id = ? order by id desc ', [req.user.id]);


  res.render('links/mis_documentos', {
    documentos
  });
});


router.get('/inbox_antecedentes', isLoggedIn, async (req, res) => {


  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const id_cliente = req.query.id_cliente || "%";
  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";

  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;


  const clientes = await pool.query('SELECT * FROM clientes WHERE 1');

  const antecedentes = await pool.query('SELECT a.*,b.razon_social FROM estudios_antecedentes AS a INNER JOIN clientes AS b ON (a.id_cliente=b.id) WHERE LOWER(a.nombre) LIKE LOWER(?) AND a.cedula LIKE ? AND LOWER(a.estado) LIKE LOWER(?) AND LOWER(a.referencia) LIKE LOWER(?) AND LOWER(a.tipo) LIKE LOWER(?) AND a.id_cliente LIKE ? AND date(a.fecha_creacion) LIKE ?   order by a.id desc LIMIT ? OFFSET ?', [name, id, status, reference, type, id_cliente, f_creacion, limit, offset]);
  //console.log(antecedentes);
  //res.send('Leido');
  res.render('links/inbox_antecedentes', {
    antecedentes,
    query: req.query,
    clientes
  });
});

router.get('/entrega_antecedente/:id', isLoggedIn, async (req, res) => {

  const {
    id
  } = req.params;

  const links = await pool.query('SELECT * FROM estudios_antecedentes WHERE id = ?', [id]);

  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id=? limit 1', links[0].id_cliente);

  nombre_cliente = nombre_cliente[0].razon_social;

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_antecedentes", id]);

  res.render('links/entrega_antecedente', {
    links,
    nombre_cliente,
    novedades
  });
});


router.get('/cancelar_antecedente/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_antecedentes WHERE id = ?', [id]);
  //console.log(links);
  res.render('links/cancelar_antecedente', {
    links
  });
});


router.get('/detalle_antecedente/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_antecedentes WHERE id = ?', [id]);

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_antecedentes", id]);
  //console.log(novedades);
  res.render('links/detalle_antecedente', {
    links,
    novedades
  });
});


router.post('/cancelar_antecedente_cliente', async (req, res) => {

  await pool.query('UPDATE estudios_antecedentes set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'Antecedente cancelado');
  res.redirect('/links/consulta_antecedentes');

});

router.post('/cancelar_antecedente_coordinador', async (req, res) => {

  await pool.query('UPDATE estudios_antecedentes set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'Antecedente cancelado');
  res.redirect('/links/inbox_antecedentes');


});


router.post('/nueva_novedad', async (req, res) => {

  const origin = pathExtractor(req);

  const {
    id_estudio,
    id_usuario,
    tipo_estudio,
    nombre,
    cedula,
    emisor,
    novedad,
    adjunto,
    fecha_entrega
  } = req.body;

  let url_origen = "";

  let url_coord = "";
  let t_estudio_msg = ""
  let coord = ""

  if (tipo_estudio == "estudios_antecedentes") {
    url_origen = "detalle_antecedente";
    t_estudio_msg = "estudio de antecedente";
    coord = "gestor_ante";
    url_coord = "entrega_antecedente"
  }
  if (tipo_estudio == "estudios_hv") {
    url_origen = "detalle_hv";
    t_estudio_msg = "estudio de hoja de vida";
    coord = "gestor_hv";
    url_coord = "entrega_hv"
  }
  if (tipo_estudio == "estudios_visitas") {
    url_origen = "detalle_visita";
    t_estudio_msg = "visita domiciliaria";
    coord = "gestor_visita";
    url_coord = "entrega_visita"
  }
  if (tipo_estudio == "estudios_esp") {
    url_origen = "detalle_esp";
    t_estudio_msg = "estudio ESP";
    coord = "gestor_esp";
    url_coord = "entrega_esp"
  }
  if (tipo_estudio == "estudios_poligrafia") {
    url_origen = "detalle_poligrafia";
    t_estudio_msg = "estudio de poligrafia";
    coord = "gestor_poligrafia";
    url_coord = "entrega_poligrafia"
  }


  if (req.files) {
    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
    let archivo = req.files.adjunto;

    //console.log(req.files);
    let fecha_archivo = moment(Date.now()).format('YYYYMMDD_HHMM');

    // returns
    let ext = fileExtension(archivo.name);

    let formato = "novedad_estudio_no" + id_estudio + "_" + fecha_archivo + "." + ext;

    //Use the mv() method to place the file in upload directory (i.e. "uploads")
    archivo.mv('./src/public/adjuntos_novedades/' + formato);

    const newLink = {
      tipo_estudio,
      id_estudio,
      emisor,
      novedad,
      adjunto: formato
    };

    await pool.query('INSERT INTO novedades set ?', [newLink]);


  } else {

    const newLink = {
      tipo_estudio,
      id_estudio,
      emisor,
      novedad
    };

    await pool.query('INSERT INTO novedades set ?', [newLink]);

  }

  //console.log(req.body);

  if (emisor == "Ares") {
    let asunto = "Nueva novedad de " + t_estudio_msg + "#" + id_estudio + " suministrada";
    let msg_txt = "Se ha suministrado una nueva novedad de " + t_estudio_msg + " #" + id_estudio + ", nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/" + url_origen + "/" + id_estudio;
    let msg_html = "<b>Se ha suministrado una nueva novedad de " + t_estudio_msg + ":</b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + id_estudio + "<br>Visite: <a href='https://ares.digitall.io/links/" + url_origen + "/" + id_estudio + "'>ESTE LINK</a> para ver más detalles y/o consultar el estado de la solicitud.";

    const cliente = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id_usuario]);

    mail2(cliente[0].email, asunto, msg_txt, msg_html);
  }


  if (emisor == "Cliente") { //enviar norificacion a coordinadores
    const coordinadores = await pool.query('SELECT * FROM usuarios WHERE ? = 1', coord);


    let asunto2 = "Nueva novedad de #" + id_estudio + " recibida";
    let msg_txt2 = "Se ha suministrado una nueva novedad de " + t_estudio_msg + " #" + id_estudio + ", nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/" + url_coord + "/" + id_estudio;
    let msg_html2 = "<b>Se ha suministrado una nueva novedad de " + t_estudio_msg + ":</b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + id_estudio + "<br>Visite: <a href='http://ares.digitall.io/links/" + url_coord + "/" + id_estudio + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

    coordinadores.forEach(function(item) {
      mail2(item.email, asunto2, msg_txt2, msg_html2);
    });

  }

  req.flash('success', 'La novedad ha sido enviada');
  res.redirect(origin);


  //res.send('Recibido');
  //  res.render('links/new');
});


router.post('/preliminar', async (req, res) => {

  const origin = pathExtractor(req);

  let fecha_preliminar = moment(Date.now()).format('YYYY-MM-DD HH:MM:SS');

  let fecha_archivo = moment(Date.now()).format('YYYYMMDD_HHMM');

  const {
    tipo_estudio,
    nombre,
    cedula,
    id_usuario,
    id_estudio,
    preliminar
  } = req.body;


  let url_origen = "";
  let t_estudio_msg = ""

  if (tipo_estudio == "estudios_antecedentes") {
    url_origen = "detalle_antecedente";
    t_estudio_msg = "estudio de antecedente"
  }
  if (tipo_estudio == "estudios_hv") {
    url_origen = "detalle_hv";
    t_estudio_msg = "estudio de hija de vida"
  }
  if (tipo_estudio == "estudios_visitas") {
    url_origen = "detalle_visita";
    t_estudio_msg = "visita domiciliaria"
  }
  if (tipo_estudio == "estudios_esp") {
    url_origen = "detalle_esp";
    t_estudio_msg = "estudio ESP"
  }
  if (tipo_estudio == "estudios_poligrafia") {
    url_origen = "detalle_poligrafia";
    t_estudio_msg = "estudio de poligrafia"
  }

  if (req.files) {

    let archivo = req.files.adjunto_preliminar;

    let ext = fileExtension(archivo.name);

    let formato = "preliminar_estudio_no" + id_estudio + "_" + fecha_archivo + "." + ext;

    archivo.mv('./src/public/adjuntos_preliminar/' + formato);



    if (tipo_estudio == "estudios_antecedentes") {
      await pool.query('UPDATE estudios_antecedentes SET preliminar = ?, adjunto_preliminar=?,fecha_preliminar=? WHERE id=?', [preliminar, formato, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_hv") {
      uno = await pool.query('UPDATE estudios_hv SET preliminar = ?, adjunto_preliminar=?,fecha_preliminar=?  WHERE id=?', [preliminar, formato, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_visitas") {
      uno = await pool.query('UPDATE estudios_visitas SET preliminar = ?, adjunto_preliminar=?,fecha_preliminar=?  WHERE id=?', [preliminar, formato, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_esp") {
      uno = await pool.query('UPDATE estudios_esp SET preliminar = ?, adjunto_preliminar=?,fecha_preliminar=?  WHERE id=?', [preliminar, formato, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_poligrafia") {
      uno = await pool.query('UPDATE estudios_poligrafia SET preliminar = ?, adjunto_preliminar=?,fecha_preliminar=?  WHERE id=?', [preliminar, formato, fecha_preliminar, id_estudio]);
    }



  } else {



    if (tipo_estudio == "estudios_antecedentes") {
      await pool.query('UPDATE estudios_antecedentes SET preliminar = ?,fecha_preliminar=?  WHERE id=?', [preliminar, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_hv") {
      uno = await pool.query('UPDATE estudios_hv SET preliminar = ?,fecha_preliminar=? WHERE id=?', [preliminar, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_visitas") {
      uno = await pool.query('UPDATE estudios_visitas SET preliminar = ?,fecha_preliminar=? WHERE id=?', [preliminar, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_esp") {
      uno = await pool.query('UPDATE estudios_esp SET preliminar = ?,fecha_preliminar=? WHERE id=?', [preliminar, fecha_preliminar, id_estudio]);
    }

    if (tipo_estudio == "estudios_poligrafia") {
      uno = await pool.query('UPDATE estudios_poligrafia SET preliminar = ?,fecha_preliminar=? WHERE id=?', [preliminar, fecha_preliminar, id_estudio]);
    }


  }


  //console.log(req.body);

  let asunto = "Informacion preliminar de " + t_estudio_msg + "#" + id_estudio + " suministrada";
  let msg_txt = "Se ha suministrado información preliminar de " + t_estudio_msg + " #" + id_estudio + ", nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/" + url_origen + "/" + id_estudio;
  let msg_html = "<b>Se ha suministrado información preliminar " + t_estudio_msg + ":</b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + id_estudio + "<br>Visite: <a href='https://ares.digitall.io/links/" + url_origen + "/" + id_estudio + "'>ESTE LINK</a> para ver más detalles y/o consultar el estado de la solicitud.";


  const cliente = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id_usuario]);

  mail2(cliente[0].email, asunto, msg_txt, msg_html);


  req.flash('success', 'Información enviada al cliente');
  res.redirect(origin);

});


router.post('/subir_reporte_antecedente', async (req, res) => {


  try {
    if (!req.files) {

      res.send({
        status: false,
        message: 'No file uploaded'
      });

    } else {
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
      let archivo = req.files.archivo;

      const {
        tipo,
        nombre,
        cedula,
        resultado,
        id_estudio,
        id_usuario,
        nota
      } = req.body;

      let fecha_entrega = moment(Date.now()).format('YYYY-MM-DD h:mm:ss');

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "adjunto_novedad_" + id_estudio + "_" + fecha_archivo + "." + ext;


      //Use the mv() method to place the file in upload directory (i.e. "uploads")
      archivo.mv('./src/public/entregas/' + formato);

      await pool.query('UPDATE estudios_antecedentes set estado = ?, resultado=?, resultado_doc=?, nota_entrega=?, fecha_entrega=? where id=?', ["completado", resultado, formato, nota, fecha_entrega, id_estudio]);

      const cliente = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id_usuario]);

      let asunto = "Estudio #" + id_estudio + " completado";
      let msg_txt = "Se ha completado el estudio de antecedentes. Tipo:" + tipo + ", nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/detalle_antecedente/" + id_estudio;
      let msg_html = "<b>Se ha completado el estudio de antecedentes <br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_antecedente/" + id_estudio + "'>ESTE LINK</a> para ver más detalles.";

      mail2(cliente[0].email, asunto, msg_txt, msg_html);


    }
  } catch (err) {
    res.status(500).send(err);
  }


  //  res.render('links/new');
  req.flash('success', 'Estudio completado');
  res.redirect('/links/inbox_antecedentes');
});



////////////////////////////////////FIN DE ESTUDIOS ANTECEDENTES/////////////////////////////////////






////////////////////////////////////////////ESTUDIOS HV////////////////////////////////////////////


router.post('/nuevo_estudio_hv', async (req, res) => {

  //console.log(req.body);
  //console.log(req.files.archivo);
  try {
    if (!req.files) {

      res.send({
        status: false,
        message: 'No file uploaded'
      });

    } else {
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
      let archivo = req.files.archivo;

      const {
        nombre,
        cedula,
        departamento,
        ciudad,
        referencia,
        nota
      } = req.body;

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "hv_" + cedula + "_" + fecha_archivo + "." + ext;


      archivo.mv('./src/public/uploads/' + formato);


      const newLink = {
        nombre,
        cedula,
        departamento,
        ciudad,
        nota_cliente: nota,
        archivo: formato,
        referencia,
        user_id: req.user.id,
        id_cliente: req.user.id_cliente
      };

      //console.log(newLink);

      const q_res = await pool.query('INSERT INTO estudios_hv set ?', [newLink]);


      // ---------------------NOTICACION A USUARIO-------------------------------//
      let asunto = "Solicitud de estudio de estudio de Hoja de vida #" + q_res.insertId + " recibida";
      let msg_txt = "Usted ha enviado una nueva solicitud de estudio de Hoja de vida : nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_hv/" + q_res.insertId;
      let msg_html = "<b>Usted ha enviado una nueva solicitud de estudio de Hoja de vida . </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_hv/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
      mail2(usuario[0].email, asunto, msg_txt, msg_html);

      // ---------------------FIN NOTICACION A USUARIO-------------------------------//


      // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
      let asunto1 = "Solicitud de estudio de estudio de Hoja de vida  #" + q_res.insertId + " recibida";
      let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de estudio de Hoja de vida . Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_hv/" + q_res.insertId;
      let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de estudio de Hoja de vida : </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_hv/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles.";

      const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

      admins_cuenta.forEach(function(item) {
        mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
      });

      // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//


      // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
      const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_hv = 1');

      let asunto2 = "Nuevo estudio de Hoja de vida #" + q_res.insertId + " recibido";
      let msg_txt2 = "Se ha recibido una nueva solicitud de estudio de Hoja de vida. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_hv/" + q_res.insertId;
      let msg_html2 = "<b>Se ha recibido una nueva solicitud de estudio de Hoja de vida. </b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_hv/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      coordinadores.forEach(function(item) {
        mail2(item.email, asunto2, msg_txt2, msg_html2);
      });

      // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//



    }
  } catch (err) {
    res.status(500).send(err);
    console.log(err);
  }

  //  res.render('links/new');
  req.flash('success', 'Su solicitud ha sido enviada');
  res.redirect('/links/consulta_hv');
});



router.get('/consulta_hv', isLoggedIn, async (req, res) => {


  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  let hv;

  if (req.user.admin_cuenta == "1") {

    hv = await pool.query('SELECT * FROM estudios_hv WHERE id_cliente = ? AND LOWER(nombre) LIKE LOWER(?) AND LOWER(cedula) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND DATE(fecha_creacion) LIKE ?  AND LOWER(estado) LIKE LOWER(?) order by id desc LIMIT ? OFFSET ?', [req.user.id_cliente, name, id, reference, f_creacion, status, limit, offset]);

  } else {
    hv = await pool.query('SELECT * FROM estudios_hv WHERE user_id = ? AND LOWER(nombre) LIKE LOWER(?) AND LOWER(cedula) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND DATE(fecha_creacion) LIKE ?   AND estado LOWER(estado)  order by id desc LIMIT ? OFFSET ?', [req.user.id, name, id, reference, f_creacion, status, limit, offset]);

  }


  console.log(hv);
  //res.send('Leido');
  res.render('links/consulta_hv', {
    hv,
    query: req.query
  });
});

router.get('/inbox_hv', isLoggedIn, async (req, res) => {


  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const id_cliente = req.query.id_cliente || "%";
  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const clientes = await pool.query('SELECT * FROM clientes WHERE 1');


  //const antecedentes = await pool.query('SELECT a.*,b.razon_social FROM estudios_antecedentes AS a INNER JOIN clientes AS b ON (a.id_cliente=b.id) WHERE LOWER(a.nombre) LIKE LOWER(?) AND a.cedula LIKE ? AND LOWER(a.estado) LIKE LOWER(?) AND LOWER(a.referencia) LIKE LOWER(?) AND LOWER(a.tipo) LIKE LOWER(?) AND a.id_cliente LIKE ? AND date(a.fecha_creacion) LIKE ? AND date(a.fecha_entrega) LIKE ? order by a.id desc LIMIT ? OFFSET ?',[name,id,status,reference,type,id_cliente,f_creacion,f_entrega,limit,offset]);

  const hv = await pool.query('SELECT a.*,b.razon_social FROM estudios_hv AS a INNER JOIN clientes AS b ON (a.id_cliente=b.id) WHERE LOWER(a.nombre) LIKE LOWER(?) AND LOWER(a.estado) LIKE LOWER(?) AND LOWER(a.referencia) LIKE LOWER(?) AND a.id_cliente like ? AND date(a.fecha_creacion) LIKE ?  order by a.id desc LIMIT ? OFFSET ?', [name, status, reference, id_cliente, f_creacion, limit, offset]);




  //console.log(hv);
  res.render('links/inbox_hv', {
    hv,
    query: req.query,
    clientes
  });
});

router.get('/entrega_hv/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_hv WHERE id = ?', [id]);

  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id=? limit 1', links[0].id_cliente);

  nombre_cliente = nombre_cliente[0].razon_social;

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_hv", id]);
  //console.log(links);
  res.render('links/entrega_hv', {
    links,
    nombre_cliente,
    novedades
  });
});


router.get('/cancelar_hv/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_hv WHERE id = ?', [id]);
  //console.log(links);
  res.render('links/cancelar_hv', {
    links
  });
});


router.get('/detalle_hv/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_hv WHERE id = ?', [id]);


  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_hv", id]);
  //console.log(links);
  res.render('links/detalle_hv', {
    links,
    novedades
  });
});


router.post('/cancelar_hv_cliente', async (req, res) => {

  await pool.query('UPDATE estudios_hv set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'Estudio de HV cancelado');
  res.redirect('/links/consulta_hv');

});

router.post('/cancelar_hv_coordinador', async (req, res) => {

  await pool.query('UPDATE estudios_hv set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'Estudio de HV cancelado');
  res.redirect('/links/inbox_hv');


});


router.post('/subir_reporte_hv', async (req, res) => {

  try {
    if (!req.files) {

      res.send({
        status: false,
        message: 'No file uploaded'
      });

    } else {
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
      let archivo = req.files.archivo;

      const {
        tipo,
        nombre,
        cedula,
        resultado,
        id_estudio,
        id_usuario,
        nota
      } = req.body;

      let fecha_entrega = moment(Date.now()).format('YYYY-MM-DD h:mm:ss');


      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "informe_estudio_no" + id_estudio + "_" + fecha_archivo + "." + ext;



      //Use the mv() method to place the file in upload directory (i.e. "uploads")
      archivo.mv('./src/public/entregas/' + formato);

      await pool.query('UPDATE estudios_hv set estado = ?, resultado=?, resultado_doc=?, nota_entrega=?, fecha_entrega=? where id=?', ["completado", resultado, formato, nota, fecha_entrega, id_estudio]);

      const cliente = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id_usuario]);

      let asunto = "Estudio #" + id_estudio + " completado";
      let msg_txt = "Se ha completado el estudio de Hoja de Vida. Nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/detalle_hv/" + id_estudio;
      let msg_html = "<b>Se ha completado el estudio de Hoja de Vida. <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_hv/" + id_estudio + "'>ESTE LINK</a> para ver más detalles.";

      mail2(cliente[0].email, asunto, msg_txt, msg_html);



    }
  } catch (err) {
    res.status(500).send(err);
  }

  req.flash('success', 'Estudio completado');
  res.redirect('/links/inbox_hv');
});

//////////////////////////////////FIN ESTUDIOS HV////////////////////////////////////////////



//////////////////////////////////ESTUDIOS VISITA///////////////////////////////////////////


router.post('/nuevo_estudio_visita', async (req, res) => {


  try {
    if (!req.files) {

      const {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        tipo_estudio,
        emisor,
        nota
      } = req.body;
      const newLink = {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        nota_cliente: nota,
        user_id: req.user.id,
        id_cliente: req.user.id_cliente
      };

      const q_res = await pool.query('INSERT INTO estudios_visitas set ?', [newLink]);


      // ---------------------NOTICACION A USUARIO-------------------------------//
      let asunto = "Solicitud de visita domiciliaria #" + q_res.insertId + " recibida";
      let msg_txt = "Usted ha enviado una nueva solicitud de visita domiciliaria. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_visita/" + q_res.insertId;
      let msg_html = "<b>Usted ha enviado una nueva solicitud de visita domiciliaria: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_visita/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
      mail2(usuario[0].email, asunto, msg_txt, msg_html);

      // ---------------------FIN NOTICACION A USUARIO-------------------------------//


      // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
      let asunto1 = "Solicitud de estudio de visita domiciliaria  #" + q_res.insertId + " recibida";
      let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de visita domiciliaria. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_visita/" + q_res.insertId;
      let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de visita domiciliaria: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_visita/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles.";

      const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

      admins_cuenta.forEach(function(item) {
        mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
      });

      // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//



      // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
      const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_visita = 1');

      let asunto2 = "Nueva solicitud de visita domiciliaria #" + q_res.insertId + " recibida";
      let msg_txt2 = "Se ha recibido una nueva solicitud de visita domiciliaria. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_visitas/" + q_res.insertId;
      let msg_html2 = "<b>Se ha recibido una nueva solicitud de estudio de visita domiciliaria. </b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_visitas/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      coordinadores.forEach(function(item) {
        mail2(item.email, asunto2, msg_txt2, msg_html2);
      });

      // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//




    } else {
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
      const {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        tipo_estudio,
        emisor,
        nota
      } = req.body;
      let archivo = req.files.archivo;

      //Use the mv() method to place the file in upload directory (i.e. "uploads")

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "hv_" + cedula + "_" + fecha_archivo + "." + ext;


      archivo.mv('./src/public/uploads/' + formato);



      const newLink = {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        nota_cliente: nota,
        archivo: formato,
        user_id: req.user.id,
        id_cliente: req.user.id_cliente
      };

      const q_res = await pool.query('INSERT INTO estudios_visitas set ?', [newLink]);


      // ---------------------NOTICACION A USUARIO-------------------------------//
      let asunto = "Solicitud de visita domiciliaria #" + q_res.insertId + " recibida";
      let msg_txt = "Usted ha enviado una nueva solicitud de visita domiciliaria. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_visita/" + q_res.insertId;
      let msg_html = "<b>Usted ha enviado una nueva solicitud de visita domiciliaria: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_visita/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
      mail2(usuario[0].email, asunto, msg_txt, msg_html);

      // ---------------------FIN NOTICACION A USUARIO-------------------------------//


      // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
      let asunto1 = "Solicitud de estudio de visita domiciliaria  #" + q_res.insertId + " recibida";
      let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de visita domiciliaria. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_visita/" + q_res.insertId;
      let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de visita domiciliaria: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_visita/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles..";

      const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

      admins_cuenta.forEach(function(item) {
        mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
      });

      // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//


      // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
      const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_visita = 1');

      let asunto2 = "Nueva solicitud de visita domiciliaria #" + q_res.insertId + " recibida";
      let msg_txt2 = "Se ha recibido una nueva solicitud de visita domiciliaria. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_visitas/" + q_res.insertId;
      let msg_html2 = "<b>Se ha recibido una nueva solicitud de estudio de visita domiciliaria. </b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_visitas/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      coordinadores.forEach(function(item) {
        mail2(item.email, asunto2, msg_txt2, msg_html2);
      });

      // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//

    }
  } catch (err) {
    res.status(500).send(err);
  }

  req.flash('success', 'Su solicitud ha sido enviada');
  res.redirect('/links/consulta_visitas');
});

router.get('/consulta_visitas', isLoggedIn, async (req, res) => {

  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  let visitas;

  if (req.user.admin_cuenta == "1") {
    visitas = await pool.query('SELECT * FROM estudios_visitas WHERE id_cliente = ? AND LOWER(nombre) LIKE LOWER(?) AND cedula LIKE ? AND LOWER(estado) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND date(fecha_creacion) LIKE ? order by id desc LIMIT ? OFFSET ?', [req.user.id_cliente, name, id, status, reference, f_creacion, limit, offset]);
  } else {
    visitas = await pool.query('SELECT * FROM estudios_visitas WHERE user_id = ? AND LOWER(nombre) LIKE LOWER(?) AND cedula LIKE ? AND LOWER(estado) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND date(fecha_creacion) LIKE ?  order by id desc LIMIT ? OFFSET ?', [req.user.id, name, id, status, reference, f_creacion, limit, offset]);
  }


  console.log(visitas);
  //res.send('Leido');
  res.render('links/consulta_visitas', {
    visitas,
    query: req.query
  });
});

router.get('/inbox_visitas', isLoggedIn, async (req, res) => {

  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const id_cliente = req.query.id_cliente || "%";
  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const clientes = await pool.query('SELECT * FROM clientes WHERE 1');

  const visitas = await pool.query('SELECT a.*,b.razon_social FROM estudios_visitas AS a INNER JOIN clientes AS b ON (a.id_cliente=b.id) WHERE LOWER(a.nombre) LIKE LOWER(?) AND a.cedula LIKE ? AND LOWER(a.estado) LIKE LOWER(?) AND LOWER(a.referencia) LIKE LOWER(?) AND a.id_cliente LIKE ? AND date(a.fecha_creacion) LIKE ? order by a.id desc LIMIT ? OFFSET ?', [name, id, status, reference, id_cliente, f_creacion, limit, offset]);

  //res.send('Leido');
  res.render('links/inbox_visitas', {
    visitas,
    query: req.query,
    clientes
  });
});

router.get('/entrega_visitas/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_visitas WHERE id = ?', [id]);

  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id=? limit 1', links[0].id_cliente);

  nombre_cliente = nombre_cliente[0].razon_social;

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_visitas", id]);
  //console.log(links);
  res.render('links/entrega_visita', {
    links,
    novedades,
    nombre_cliente,
    query: req.query
  });
});


router.get('/cancelar_visita/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_visitas WHERE id = ?', [id]);
  //console.log(links);
  res.render('links/cancelar_visita', {
    links
  });
});


router.get('/detalle_visita/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_visitas WHERE id = ?', [id]);

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_visitas", id]);
  //console.log(links);
  res.render('links/detalle_visita', {
    links,
    novedades
  });
});


router.post('/cancelar_visita_cliente', async (req, res) => {

  await pool.query('UPDATE estudios_visitas set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'Visita cancelada');
  res.redirect('/links/consulta_visitas');

});

router.post('/cancelar_visita_coordinador', async (req, res) => {

  await pool.query('UPDATE estudios_visitas set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'Visita cancelada');
  res.redirect('/links/inbox_visitas');


});



router.post('/subir_reporte_visita', async (req, res) => {


  try {
    if (!req.files) {

      res.send({
        status: false,
        message: 'No file uploaded'
      });

    } else {
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file


      let archivo = req.files.archivo;

      const {
        tipo,
        nombre,
        cedula,
        resultado,
        id_estudio,
        id_usuario,
        novedad
      } = req.body;

      let fecha_entrega = moment(Date.now()).format('YYYY-MM-DD h:mm:ss');

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "informe_estudio_no" + id_estudio + "_" + fecha_archivo + "." + ext;


      //Use the mv() method to place the file in upload directory (i.e. "uploads")
      archivo.mv('./src/public/entregas/' + formato);



      await pool.query('UPDATE estudios_visitas set estado = ?, resultado=?, resultado_doc=?, nota_entrega=?, fecha_entrega=? where id=?', ["completado", resultado, formato, nota, fecha_entrega, id_estudio]);

      const cliente = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id_usuario]);

      let asunto = "Estudio #" + id_estudio + " completado";
      let msg_txt = "Se ha completado una visita domiciliaria. Nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles del informe visite: https://ares.digitall.io/detalle_visita/" + id_estudio;
      let msg_html = "<b>Se ha completado una visita domiciliaria. <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_visita/" + id_estudio + "'>ESTE LINK</a> para ver más detalles.";

      mail2(cliente[0].email, asunto, msg_txt, msg_html);
    }
  } catch (err) {
    res.status(500).send(err);
  }

  req.flash('success', 'Estudio completado');
  res.redirect('/links/inbox_visitas');
});
//////////////////////////////////////FIN ESTUDIOS VISITA////////////////////////////////////////////





/////////////////////////////////////////ESTUDIOS ESP////////////////////////////////////////////////

router.post('/nuevo_estudio_esp', isLoggedIn, async (req, res) => {


  try {
    if (req.files) {


      const {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        tipo_estudio,
        emisor,
        nota
      } = req.body;
      let archivo = req.files.archivo;

      //Use the mv() method to place the file in upload directory (i.e. "uploads")

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "hv_" + cedula + "_" + fecha_archivo + "." + ext;

      archivo.mv('./src/public/uploads/' + formato);


      const newLink = {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        nota_cliente: nota,
        archivo: formato,
        user_id: req.user.id,
        id_cliente: req.user.id_cliente
      };



      const q_res = await pool.query('INSERT INTO estudios_esp set ?', [newLink]);


      // ---------------------NOTICACION A USUARIO-------------------------------//
      let asunto = "Solicitud de ESP #" + q_res.insertId + " recibida";
      let msg_txt = "Usted ha enviado una nueva solicitud de ESP. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_esp/" + q_res.insertId;
      let msg_html = "<b>Usted ha enviado una nueva solicitud de ESP: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_esp/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
      mail2(usuario[0].email, asunto, msg_txt, msg_html);

      // ---------------------FIN NOTICACION A USUARIO-------------------------------//


      // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
      let asunto1 = "Solicitud de estudio de ESP #" + q_res.insertId + " recibida";
      let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de ESP. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_esp/" + q_res.insertId;
      let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de ESP: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_esp/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles.";

      const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

      admins_cuenta.forEach(function(item) {
        mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
      });

      // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//


      // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
      const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_esp = 1');

      let asunto2 = "Nueva solicitud de ESP #" + q_res.insertId + " recibida";
      let msg_txt2 = "Se ha recibido una nueva solicitud de ESP. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_esp/" + q_res.insertId;
      let msg_html2 = "<b>Se ha recibido una nueva solicitud de ESP. </b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_esp/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      coordinadores.forEach(function(item) {
        mail2(item.email, asunto2, msg_txt2, msg_html2);
      });

      // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//





    } else {

      const {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        tipo_estudio,
        emisor,
        nota
      } = req.body;
      const newLink = {
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        referencia,
        nota_cliente: nota,
        direccion,
        user_id: req.user.id,
        id_cliente: req.user.id_cliente
      };

      const q_res = await pool.query('INSERT INTO estudios_esp set ?', [newLink]);


      // ---------------------NOTICACION A USUARIO-------------------------------//
      let asunto = "Solicitud de ESP #" + q_res.insertId + " recibida";
      let msg_txt = "Usted ha enviado una nueva solicitud de ESP. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_esp/" + q_res.insertId;
      let msg_html = "<b>Usted ha enviado una nueva solicitud de ESP: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_esp/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
      mail2(usuario[0].email, asunto, msg_txt, msg_html);

      // ---------------------FIN NOTICACION A USUARIO-------------------------------//


      // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
      let asunto1 = "Solicitud de estudio de ESP #" + q_res.insertId + " recibida";
      let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de ESP. Tipo: Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_esp/" + q_res.insertId;
      let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de ESP: </b> <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_esp/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles.";

      const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

      admins_cuenta.forEach(function(item) {
        mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
      });

      // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//


      // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
      const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_esp = 1');

      let asunto2 = "Nueva solicitud de ESP #" + q_res.insertId + " recibida";
      let msg_txt2 = "Se ha recibido una nueva solicitud de ESP. Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_esp/" + q_res.insertId;
      let msg_html2 = "<b>Se ha recibido una nueva solicitud de ESP. </b><br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_esp/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      coordinadores.forEach(function(item) {
        mail2(item.email, asunto2, msg_txt2, msg_html2);
      });

      // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//




    }
  } catch (err) {

    res.status(500).send(err);
    console.log(err);
  }

  //console.log(req.body);
  //res.send('Recibido');
  req.flash('success', 'Su solicitud ha sido enviada');
  res.redirect('/links/consulta_esp');
});

router.get('/consulta_esp', isLoggedIn, async (req, res) => {

  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  let esp;

  if (req.user.admin_cuenta == "1") {
    esp = await pool.query('SELECT * FROM estudios_esp WHERE id_cliente = ? AND LOWER(nombre) LIKE LOWER(?) AND cedula LIKE ? AND LOWER(estado) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND date(fecha_creacion) LIKE ?  order by id desc LIMIT ? OFFSET ?', [req.user.id_cliente, name, id, status, reference, f_creacion, limit, offset]);
  } else {
    esp = await pool.query('SELECT * FROM estudios_esp WHERE user_id = ? AND LOWER(nombre) LIKE LOWER(?) AND cedula LIKE ? AND LOWER(estado) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND date(fecha_creacion) LIKE ?  order by id desc LIMIT ? OFFSET ?', [req.user.id, name, id, status, reference, f_creacion, limit, offset]);
  }



  //console.log(antecedentes);
  //res.send('Leido');
  res.render('links/consulta_esp', {
    esp,
    query: req.query
  });
});

router.get('/inbox_esp', isLoggedIn, async (req, res) => {

  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const id_cliente = req.query.id_cliente || "%";
  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";


  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;


  const clientes = await pool.query('SELECT * FROM clientes WHERE 1');


  const esp = await pool.query('SELECT a.*,b.razon_social FROM estudios_esp AS a INNER JOIN clientes AS b ON (a.id_cliente=b.id) WHERE LOWER(a.nombre) LIKE LOWER(?) AND a.cedula LIKE ? AND LOWER(a.estado) LIKE LOWER(?) AND LOWER(a.referencia) LIKE LOWER(?) AND a.id_cliente LIKE ? AND date(a.fecha_creacion) LIKE ? order by a.id desc LIMIT ? OFFSET ?', [name, id, status, reference, id_cliente, f_creacion, limit, offset]);
  //console.log(antecedentes);
  //res.send('Leido');
  res.render('links/inbox_esp', {
    esp,
    query: req.query,
    clientes
  });
});

router.get('/entrega_esp/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_esp WHERE id = ?', [id]);

  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id=? limit 1', links[0].id_cliente);

  nombre_cliente = nombre_cliente[0].razon_social;

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_esp", id]);
  //console.log(links);
  res.render('links/entrega_esp', {
    links,
    nombre_cliente,
    novedades
  });
});



router.get('/cancelar_esp/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_esp WHERE id = ?', [id]);
  //console.log(links);
  res.render('links/cancelar_esp', {
    links
  });
});


router.get('/detalle_esp/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_esp WHERE id = ?', [id]);

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_esp", id]);
  //console.log(links);
  res.render('links/detalle_esp', {
    links,
    novedades
  });
});


router.post('/cancelar_esp_cliente', async (req, res) => {

  await pool.query('UPDATE estudios_esp set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'ESP cancelado');
  res.redirect('/links/consulta_esp');

});

router.post('/cancelar_esp_coordinador', async (req, res) => {

  await pool.query('UPDATE estudios_esp set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'ESP cancelado');
  res.redirect('/links/inbox_esp');


});



router.post('/subir_reporte_esp', async (req, res) => {

  try {
    if (!req.files) {

      res.send({
        status: false,
        message: 'No file uploaded'
      });

    } else {
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
      let archivo = req.files.archivo;

      const {
        tipo,
        nombre,
        cedula,
        resultado,
        id_estudio,
        id_usuario,
        nota
      } = req.body;

      let fecha_entrega = moment(Date.now()).format('YYYY-MM-DD h:mm:ss');

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "informe_estudio_no" + id_estudio + "_" + fecha_archivo + "." + ext;


      //Use the mv() method to place the file in upload directory (i.e. "uploads")
      archivo.mv('./src/public/entregas/' + formato);



      await pool.query('UPDATE estudios_esp set estado = ?, resultado=?, resultado_doc=?, nota_entrega=?, fecha_entrega=? where id=?', ["completado", resultado, formato, nota, fecha_entrega, id_estudio]);

      const cliente = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id_usuario]);

      let asunto = "Estudio #" + id_estudio + " completado";
      let msg_txt = "Se ha completado un ESP. Nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles del informe visite: https://ares.digitall.io/detalle_esp/" + id_estudio;
      let msg_html = "<b>Se ha completado un ESP. <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_esp/" + id_estudio + "'>ESTE LINK</a> para ver más detalles.";

      mail2(cliente[0].email, asunto, msg_txt, msg_html);


    }
  } catch (err) {
    res.status(500).send(err);
  }

  req.flash('success', 'Estudio completado');
  res.redirect('/links/inbox_esp');
});

/////////////////////////////////////////FIN ESTUDIOS ESP//////////////////////////////////////////




/////////////////////////////////////ESTUDIOS POLIGRAFIA//////////////////////////////////////////

router.post('/nuevo_estudio_poligrafia', isLoggedIn, async (req, res) => {

  try {
    if (req.files) {

      const {
        tipo,
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        tipo_estudio,
        emisor
      } = req.body;
      let archivo = req.files.archivo;

      //Use the mv() method to place the file in upload directory (i.e. "uploads")

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "hv_" + cedula + "_" + fecha_archivo + "." + ext;

      archivo.mv('./src/public/uploads/' + formato);

      const newLink = {
        tipo,
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        archivo: formato,
        user_id: req.user.id,
        id_cliente: req.user.id_cliente
      };

      const q_res = await pool.query('INSERT INTO estudios_poligrafia set ?', [newLink]);



      // ---------------------NOTICACION A USUARIO-------------------------------//
      let asunto = "Solicitud de estudio de poligrafía #" + q_res.insertId + " recibida";
      let msg_txt = "Usted ha enviado una nueva solicitud de estudio de poligrafía. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId;
      let msg_html = "<b>Usted ha enviado una nueva solicitud de estudio de poligrafía: </b> <br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
      mail2(usuario[0].email, asunto, msg_txt, msg_html);

      // ---------------------FIN NOTICACION A USUARIO-------------------------------//


      // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
      let asunto1 = "Solicitud de estudio de poligrafía #" + q_res.insertId + " recibida";
      let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de poligrafía. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId;
      let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de poligrafía: </b> <br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles.";

      const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

      admins_cuenta.forEach(function(item) {
        mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
      });

      // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//


      // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
      const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_poligrafia = 1');

      let asunto2 = "Nueva solicitud de poligrafía #" + q_res.insertId + " recibida";
      let msg_txt2 = "Se ha recibido una nueva solicitud de estudio de poligrafía. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_poligrafia/" + q_res.insertId;
      let msg_html2 = "<b>Se ha recibido una nueva solicitud de estudio de poligrafía. </b><br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_poligrafia/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      coordinadores.forEach(function(item) {
        mail2(item.email, asunto2, msg_txt2, msg_html2);
      });

      // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//



    } else {

      const {
        tipo,
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        tipo_estudio,
        emisor
      } = req.body;
      const newLink = {
        tipo,
        nombre,
        cedula,
        email,
        telefono,
        departamento,
        ciudad,
        direccion,
        referencia,
        user_id: req.user.id,
        id_cliente: req.user.id_cliente
      };

      const q_res = await pool.query('INSERT INTO estudios_poligrafia set ?', [newLink]);


      // ---------------------NOTICACION A USUARIO-------------------------------//
      let asunto = "Solicitud de estudio de poligrafía #" + q_res.insertId + " recibida";
      let msg_txt = "Usted ha enviado una nueva solicitud de estudio de poligrafía. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId;
      let msg_html = "<b>Usted ha enviado una nueva solicitud de estudio de poligrafía: </b> <br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
      mail2(usuario[0].email, asunto, msg_txt, msg_html);

      // ---------------------FIN NOTICACION A USUARIO-------------------------------//


      // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
      let asunto1 = "Solicitud de estudio de poligrafía #" + q_res.insertId + " recibida";
      let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de poligrafía. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId;
      let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de poligrafía: </b> <br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_poligrafia/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles.";

      const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

      admins_cuenta.forEach(function(item) {
        mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
      });

      // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//


      // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
      const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_poligrafia = 1');

      let asunto2 = "Nueva solicitud de poligrafía #" + q_res.insertId + " recibida";
      let msg_txt2 = "Se ha recibido una nueva solicitud de estudio de poligrafía. Tipo: " + tipo + ", Nombre:" + nombre + ", cedula:" + cedula + ", el id de la solicitud es:" + q_res.insertId + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_poligrafia/" + q_res.insertId;
      let msg_html2 = "<b>Se ha recibido una nueva solicitud de estudio de poligrafía. </b><br>Tipo: " + tipo + "<br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>El ID de la solicitud es: " + q_res.insertId + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_poligrafia/" + q_res.insertId + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

      coordinadores.forEach(function(item) {
        mail2(item.email, asunto2, msg_txt2, msg_html2);
      });

      // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//



    }

  } catch (err) {
    res.status(500).send(err);
  }

  //console.log(req.body);
  //res.send('Recibido');
  req.flash('success', 'Su solicitud ha sido enviada');
  res.redirect('/links/consulta_poligrafias');
});


router.get('/consulta_poligrafias', isLoggedIn, async (req, res) => {

  const name = req.query.name || "%";
  const id = req.query.id || "%";
  const reference = req.query.reference || "%";
  const status = req.query.status || "%";
  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;


  let poligrafias;

  if (req.user.admin_cuenta === "1") {
    poligrafias = await pool.query("SELECT * FROM estudios_poligrafia WHERE id_cliente = ? AND LOWER(tipo) LIKE LOWER(?) AND LOWER(nombre) LIKE LOWER(?) AND cedula LIKE ? AND LOWER(estado) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND date(fecha_creacion) LIKE ? order by id desc LIMIT ? OFFSET ?", [req.user.id_cliente, type, name, id, status, reference, f_creacion, limit, offset]);
  } else {

    poligrafias = await pool.query("SELECT * FROM estudios_poligrafia WHERE user_id = ? AND LOWER(tipo) LIKE LOWER(?) AND LOWER(nombre) LIKE LOWER(?) AND cedula LIKE ? AND LOWER(estado) LIKE LOWER(?) AND LOWER(referencia) LIKE LOWER(?) AND date(fecha_creacion) LIKE ?  order by id desc LIMIT ? OFFSET ?", [req.user.id, type, name, id, status, reference, f_creacion, limit, offset]);
  }


  //
  //res.send('Leido');
  res.render('links/consulta_poligrafias', {
    poligrafias,
    query: req.query
  });
});

router.get('/inbox_poligrafia', isLoggedIn, async (req, res) => {

  let name = req.query.nombre_o_apellido || "%";
  name = "%" + name + "%";

  let id = req.query.id || "%";
  id = "%" + id + "%";

  let reference = req.query.reference || "%";
  reference = "%" + reference + "%";

  const id_cliente = req.query.id_cliente || "%";
  const type = req.query.type || "%";
  const f_creacion = req.query.fecha_creacion || "%";
  const f_entrega = req.query.fecha_entrega || "%";
  const status = req.query.status || "%";

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const clientes = await pool.query('SELECT * FROM clientes WHERE 1');

  const poligrafias = await pool.query('SELECT a.*,b.razon_social FROM estudios_poligrafia AS a INNER JOIN clientes AS b ON (a.id_cliente=b.id) WHERE LOWER(a.tipo) LIKE LOWER(?) AND LOWER(a.nombre) LIKE LOWER(?) AND a.cedula LIKE ? AND LOWER(a.estado) LIKE LOWER(?) AND LOWER(a.referencia) LIKE LOWER(?) order by a.id desc LIMIT ? OFFSET ?', [type, name, id, status, reference, limit, offset]);

  //console.log(poligrafias);
  //res.send('Leido');

  res.render('links/inbox_poligrafia', {
    poligrafias,
    query: req.query,
    clientes
  });

});

router.get('/grafia/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;

  const links = await pool.query('SELECT * FROM estudios_poligrafia WHERE id = ?', [id]);


  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id=? limit 1', links[0].id_cliente);

  nombre_cliente = nombre_cliente[0].razon_social;

  let detalles_inv;

  if (links[0].id_investigacion) {
    detalles_inv = await pool.query('SELECT * FROM estudios_poligrafia_investigacion WHERE id = ?', links[0].id_investigacion);
  }
  //console.log(links);
  res.render('links/entrega_poligrafia', {
    links,
    detalles_inv,
    nombre_cliente
  });
});



router.get('/cancelar_poligrafia/:id', isLoggedIn, async (req, res) => {


  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_poligrafia WHERE id = ?', [id]);
  //console.log(links);

  res.render('links/cancelar_poligrafia', {
    links
  });
});


router.get('/detalle_poligrafia/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_poligrafia WHERE id = ?', [id]);

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_poligrafias", id]);

  let detalles_inv;

  if (links[0].id_investigacion) {
    detalles_inv = await pool.query('SELECT * FROM estudios_poligrafia_investigacion WHERE id = ?', links[0].id_investigacion);
  }

  //console.log(links);
  res.render('links/detalle_poligrafia', {
    links,
    detalles_inv,
    novedades
  });
});



router.post('/cancelar_poligrafia_cliente', async (req, res) => {



  await pool.query('UPDATE estudios_poligrafia set estado = ? where id=?', ["cancelado", req.body.id]);

  if (req.body.id_investigacion) {
    req.flash('success', 'Poligrafía de ' + req.body.nombre + ' cancelada');
    res.redirect('/links/detalle_poligrafia_investigacion/' + req.body.id_investigacion);
  } else {
    req.flash('success', 'Poligrafía cancelada');
    res.redirect('/links/consulta_poligrafias');
  }

});

router.post('/cancelar_poligrafia_coordinador', async (req, res) => {

  await pool.query('UPDATE estudios_poligrafia set estado = ? where id=?', ["cancelado", req.body.id]);

  req.flash('success', 'Poligrafía cancelada');
  res.redirect('/links/inbox_poligrafia');


});




router.post('/agregar_investigacion_poligrafia', isLoggedIn, async (req, res) => {


  const {
    fecha_hechos,
    departamento,
    ciudad,
    lugar_hechos,
    descripcion,
    objetivo,
    nota_cliente,
    referencia
  } = req.body;

  let fecha = moment(fecha_hechos).format('YYYY-MM-DD');

  const newLink = {
    fecha_hechos: fecha,
    departamento,
    ciudad,
    lugar_hechos,
    descripcion,
    objetivo,
    nota_cliente,
    referencia,
    user_id: req.user.id,
    id_cliente: req.user.id_cliente
  };

  const q_res = await pool.query('INSERT INTO estudios_poligrafia_investigacion set ?', [newLink]);

  //console.log(req.body);
  //res.send('Recibido');
  req.flash('success', 'Ingrese las personas necesarias');
  res.redirect('/links/agregar_personas_investigacion_poligrafia/' + q_res.insertId);
});



router.get('/agregar_personas_investigacion_poligrafia/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_poligrafia_investigacion WHERE id = ?', [id]);

  const personas = await pool.query('SELECT * FROM estudios_poligrafia WHERE id_investigacion = ?', [id]);

  //console.log(links);
  res.render('links/agregar_personas_investigacion_poligrafia', {
    links,
    personas,
    query: req.query
  });
});


router.post('/agregar_persona_investigacion_poligrafia', isLoggedIn, async (req, res) => {

  const {
    nombre,
    cedula,
    email,
    telefono,
    cargo,
    id_investigacion,
    departamento,
    ciudad,
    referencia,
    direccion
  } = req.body;

  //console.log(req.body);
  const newLink = {
    tipo: "investigacion",
    nombre,
    cedula,
    email,
    telefono,
    cargo,
    id_investigacion,
    departamento,
    ciudad,
    referencia,
    direccion,
    user_id: req.user.id,
    id_cliente: req.user.id_cliente
  };


  const q_res = await pool.query('INSERT INTO estudios_poligrafia set ?', [newLink]);

  const links = await pool.query('SELECT * FROM estudios_poligrafia_investigacion WHERE id = ?', [id_investigacion]);

  const personas = await pool.query('SELECT * FROM estudios_poligrafia WHERE id_investigacion = ?', [id_investigacion]);


  //console.log(links);
  //res.redirect('/links/agregar_personas_investigacion_poligrafia/'+id_investigacion);
  req.flash('success', nombre + " agregado correctamente");
  res.redirect('/links/agregar_personas_investigacion_poligrafia/' + id_investigacion);


});


router.post('/retirar_persona', isLoggedIn, async (req, res) => {
  const {
    nombre,
    id_estudio,
    id_investigacion
  } = req.body;



  const q_res = await pool.query('DELETE FROM estudios_poligrafia WHERE id = ?', [id_estudio]);


  //console.log(links);

  req.flash('success', nombre + " eliminado correctamente");
  res.redirect('/links/agregar_personas_investigacion_poligrafia/' + id_investigacion);

});


router.post('/suministrar_investigacion', isLoggedIn, async (req, res) => {
  const {
    id_investigacion
  } = req.body;
  const tipo = "investigacion";


  // ---------------------NOTICACION A USUARIO-------------------------------//
  let asunto = "Solicitud de estudio de poligrafía #" + id_investigacion + " recibida";
  let msg_txt = "Usted ha enviado una nueva solicitud de estudio de poligrafía. Tipo: " + tipo + ", el id de la solicitud es:" + id_investigacion + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_poligrafia_investigacion/" + id_investigacion;
  let msg_html = "<b>Usted ha enviado una nueva solicitud de estudio de poligrafía: </b> <br>Tipo: " + tipo + "<br>El ID de la solicitud es: " + id_investigacion + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_poligrafia_investigacion/" + id_investigacion + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

  const usuario = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
  mail2(usuario[0].email, asunto, msg_txt, msg_html);

  // ---------------------FIN NOTICACION A USUARIO-------------------------------//


  // ---------------------NOTICACION A ADMIN DE CUENTA-------------------------------//
  let asunto1 = "Solicitud de estudio de poligrafía #" + id_investigacion + " recibida";
  let msg_txt1 = req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de poligrafía. Tipo: " + tipo + ",  el id de la solicitud es:" + id_investigacion + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/detalle_poligrafia_investigacion/" + id_investigacion;
  let msg_html1 = "<b>" + req.user.nombre + " " + req.user.apellido + " ha enviado una nueva solicitud de poligrafía: </b> <br>Tipo: " + tipo + "<br>El ID de la solicitud es: " + id_investigacion + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_poligrafia_investigacion/" + id_investigacion + "'>ESTE LINK</a> para ver más detalles,";

  const admins_cuenta = await pool.query('SELECT * FROM usuarios WHERE admin_cuenta=1 AND id_cliente =? AND id != ?', [req.user.id_cliente, req.user.id]);

  admins_cuenta.forEach(function(item) {
    mail2(admins_cuenta[0].email, asunto1, msg_txt1, msg_html1);
  });

  // ---------------------FIN NOTICACION A ADMIN DE CUENTA-------------------------------//


  // ---------------------NOTICACIONES A COORDINADORES-------------------------------//
  const coordinadores = await pool.query('SELECT * FROM usuarios WHERE gestor_poligrafia = 1');

  let asunto2 = "Nueva solicitud de poligrafía #" + id_investigacion + " recibida";
  let msg_txt2 = "Se ha recibido una nueva solicitud de estudio de poligrafía. Tipo: " + tipo + ", el id de la solicitud es:" + id_investigacion + ", para ver los detalles de esta solicitud visite: https://ares.digitall.io/links/entrega_poligrafia_investigacion/" + id_investigacion;
  let msg_html2 = "<b>Se ha recibido una nueva solicitud de estudio de poligrafía. </b><br>Tipo: " + tipo + "<br>El ID de la solicitud es: " + id_investigacion + "<br>Visite: <a href='http://ares.digitall.io/links/entrega_poligrafia_investigacion/" + id_investigacion + "'>ESTE LINK</a> para ver más detalles y/o gestionar la solicitud.";

  coordinadores.forEach(function(item) {
    mail2(item.email, asunto2, msg_txt2, msg_html2);
  });

  // ---------------------FIN NOTICACIONES A COORDINADORES-------------------------------//

  req.flash('success', "Solicitud enviada exitosamente");
  res.redirect('/links/consulta_poligrafias');

});




router.get('/detalle_poligrafia_investigacion/:id', isLoggedIn, async (req, res) => {

  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_poligrafia_investigacion WHERE id = ?', [id]);

  const personas = await pool.query('SELECT * FROM estudios_poligrafia WHERE id_investigacion = ?', [id]);

  //console.log(links);
  res.render('links/detalle_poligrafia_investigacion', {
    links,
    personas,
    query: req.query
  });
});


router.get('/entrega_poligrafia_investigacion/:id', isLoggedIn, async (req, res) => {

  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_poligrafia_investigacion WHERE id = ?', [id]);

  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id=? limit 1', links[0].id_cliente);

  nombre_cliente = nombre_cliente[0].razon_social;

  const personas = await pool.query('SELECT * FROM estudios_poligrafia WHERE id_investigacion = ?', [id]);

  //console.log(links);
  res.render('links/entrega_poligrafia_investigacion', {
    links,
    personas,
    nombre_cliente,
    query: req.query
  });
});

router.get('/entrega_poligrafia/:id', isLoggedIn, async (req, res) => {
  const {
    id
  } = req.params;
  const links = await pool.query('SELECT * FROM estudios_poligrafia WHERE id = ?', [id]);

  let nombre_cliente = await pool.query('SELECT * FROM clientes WHERE id=? limit 1', links[0].id_cliente);

  nombre_cliente = nombre_cliente[0].razon_social;

  const novedades = await pool.query('SELECT * FROM novedades WHERE tipo_estudio = ? AND id_estudio = ?', ["estudios_poligrafias", id]);

  //console.log(links);
  res.render('links/entrega_poligrafia', {
    links,
    nombre_cliente,
    novedades
  });
});


router.post('/subir_reporte_poligrafia', async (req, res) => {

  try {
    if (!req.files) {

      res.send({
        status: false,
        message: 'No file uploaded'
      });

    } else {
      //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
      let archivo = req.files.archivo;

      const {
        tipo,
        nombre,
        cedula,
        resultado,
        id_estudio,
        id_usuario,
        nota
      } = req.body;

      let fecha_entrega = moment(Date.now()).format('YYYY-MM-DD h:mm:ss');

      let fecha_archivo = moment(Date.now()).format('YYYYMMDD');

      let ext = fileExtension(archivo.name);

      let formato = "informe_estudio_no" + id_estudio + "_" + fecha_archivo + "." + ext;

      //Use the mv() method to place the file in upload directory (i.e. "uploads")
      archivo.mv('./src/public/entregas/' + formato);


      await pool.query('UPDATE estudios_poligrafia set estado = ?, resultado=?, resultado_doc=?, nota_entrega=?, fecha_entrega=? where id=?', ["completado", resultado, formato, nota, fecha_entrega, id_estudio]);

      const cliente = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id_usuario]);

      let asunto = "Estudio #" + id_estudio + " completado";
      let msg_txt = "Se ha completado un estudio de poligrafía. Nombre:" + nombre + ", cedula:" + cedula + ", para ver los detalles del informe visite: https://ares.digitall.io/detalle_poligrafia/" + id_estudio;
      let msg_html = "<b>Se ha completado un estudio de poligrafía. <br>Nombre: " + nombre + "<br>Cédula: " + cedula + "<br>Visite: <a href='http://ares.digitall.io/links/detalle_poligrafia/" + id_estudio + "'>ESTE LINK</a> para ver más detalles.";

      mail2(cliente[0].email, asunto, msg_txt, msg_html);


    }
  } catch (err) {
    res.status(500).send(err);
  }

  req.flash('success', 'Estudio completado');
  res.redirect('/links/inbox_poligrafia');
});

/////////////////////////////////////FIN ESTUDIOS POLIGRAFIA////////////////////////////////////////////


module.exports = router;
