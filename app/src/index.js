
'use strict';

require('dotenv').config();
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET} =  process.env;

const express = require('express');
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const path = require('path');
const exphbs = require('express-handlebars');
const session = require('express-session');
const validator = require('express-validator');
const passport = require('passport');
const pool = require('./database');
const { Strategy } = require('passport-google-oauth20');

const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const { database } = require('./keys');
var http = require('http');
const superagent = require('superagent');



// Intializations
const app = express();


passport.use(new Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: '/return'
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser(async (user, done) => {

    var usuario = await pool.query('SELECT * FROM usuarios WHERE google_id =? OR email = ?', [user.id,user._json.email]);


  if(usuario.length==0){

    var nick= user._json.given_name+" "+user._json.family_name;
    const newUser = {
      google_id:user._json.sub,
      nombre:user._json.given_name,
      apellido:user._json.family_name,
      imagen_perfil:user._json.picture,
      email:user._json.email,
      nick:nick
    //  idioma:req.user._json.locale
    };

    const result = await pool.query('INSERT INTO usuarios SET ? ', newUser);

    var data2send2 = {
      username: "armonia_"+result.insertId,
      email: user._json.email,
      pass: 'ArmoniaFit!23',
      name: nick
    }

      superagent.post('https://omni.digitall.io/api/v1/users.register')
      .send(data2send2)
      .then(res => {
        console.log("Creado en omni_chat");
      }).catch();

    usuario = await pool.query('SELECT * FROM usuarios WHERE google_id =? OR email = ?', [user.id,user._json.email]);

  }


    done(null, usuario[0]);
});

passport.deserializeUser((obj, done) => {

  done(null, obj);
});



//Settings
app.set('port',process.env.PORT || 8081);
app.set('views',path.join(__dirname,'views'));
app.engine('.hbs',exphbs({
defaulfLayout: 'main',
layoutDir: path.join(app.get('views'),'layouts'),
partialsDir: path.join(app.get('views'), 'partials'),
extname: '.hbs',
helpers: require('./lib/handlebars')
}));

app.set('view engine','.hbs');

//Middlewares
app.use(morgan('dev'));
//app.use(express.urlencoded({extended: false}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(fileUpload({
    createParentPath: true
}));


app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MySQLStore(database)
}));


app.use(require('express-session')({ secret: SESSION_SECRET, resave: true, saveUninitialized: true }));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(validator());


//Global variables
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', 'https://omni.digitall.io,*');
  res.set('Access-Control-Allow-Credentials', 'true');
  //  res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
  //  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    //res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');

  app.locals.message = req.flash('message');
  app.locals.success = req.flash('success');
  app.locals.user = req.user;
  next();
});



//Routes
app.use(require('./routes'));
app.use('/links',require('./routes/links'));
app.use(require('./routes/chat'));
app.use(require('./routes/datos_consultas'));

//Public
app.use(express.static(path.join(__dirname,"public")));

var server = http.createServer(app);

//app.configure, app.use etc

server.listen(app.get('port'), function() {

console.log('Server on port', app.get('port'));

});
