const express = require('express');
const router = express.Router();
const pool = require('../database');
const superagent = require('superagent');

const { isLoggedIn } = require('../lib/auth');


var key="hj2vk5vi7l8hvks9gxxhs3v49j7h331z4rsbu8f2u9nw5kgv";

//router.post('/consulta_vehiculo',isLoggedIn, async (req, res) => {

router.get('/consulta_vehiculo', async (req, res) => {


  if(!req.query.documentType | !req.query.documentNumber | !req.query.vehicle){

    res.send({"status":0});

  }else{

    let documentType = req.query.documentType || "%";

    let documentNumber = req.query.documentNumber || "%";

    let vehicle = req.query.vehicle || "%";


    var data={documentType,documentNumber,vehicle};


    const [respuesta] = await Promise.all([
      superagent.post('https://api.misdatos.com.co/api/co/runt/consultarVehiculo')
         .set('Content-Type', 'application/x-www-form-urlencoded')
         .set('Authorization', key)
         .send(data)
         .then()
         .catch()
    ]);

    res.send(respuesta);
  }





});



module.exports = router;
