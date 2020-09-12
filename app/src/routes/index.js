'use strict';

require('dotenv').config();
const { SESSION_SECRET} =  process.env;

const express = require('express');
const passport = require('passport');
const router = express.Router();
const pool = require('../database');


const { isLoggedIn } = require('../lib/auth');

router.get('/login/google', passport.authenticate('google', { scope: ['profile','email'] }));

router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});


router.get('/return', passport.authenticate('google', { failureRedirect: '/' }), async (req, res, next) => {

    var usuario = await pool.query('SELECT * FROM usuarios WHERE google_id =? OR email = ?', [req.user.id,req.user._json.email]);

      if(usuario[0].estado==-1){   // estado 0 = sin activar    // estado 1 = registro terminado  //  estado 2 = verificado   //  -1 = desactivado
          res.redirect('/links/usuario_desactivado');
      }else if(usuario[0].estado==0){
          res.redirect('/links/tipo_de_registro');
      }else {
        if(usuario[0].estado==2){
        if(usuario[0].es_entrenador==1){
            res.redirect('/links/perfil_entrenador');
        }else if(usuario[0].es_cliente==1){
            res.redirect('/links/perfil_cliente');
        }else{
          res.redirect('/links/tipo_de_registro');
        }
      }else{
        if(usuario[0].es_entrenador==1){
            res.redirect('/links/editar_perfil_entrenador');
        }else if(usuario[0].es_cliente==1){
            res.redirect('/links/editar_perfil_cliente');
        }else{
          res.redirect('/links/tipo_de_registro');
        }

      }

    }

  //  console.log(req.user._json);

});

router.get('/',async (req,res) => {

  const categorias = await pool.query('SELECT * FROM categorias WHERE 1');
  res.render('links/index',{categorias});
});





module.exports = router;
