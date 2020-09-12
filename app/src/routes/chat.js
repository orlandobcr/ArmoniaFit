const express = require('express');
const router = express.Router();
const pool = require('../database');

const { isLoggedIn } = require('../lib/auth');
const io = require('socket.io')(8085);


io.on('connection', (socket) => {
  //io.emit('this',  {message: 'Bienvenido al chat de soporte! Cómo podemos ayudarle?'});

  //io.emit('broadcast','Bienvenido al chat de soporte! Cómo podemos ayudarle?'); // emit an event to all connected sockets
  socket.on('chat message', (msg) => {
     //msg = msg.nick  + ": "+msg.msg;
    io.emit('chat message', msg);
    console.log(msg);
  });

 socket.on('disconnect', () => {
   io.emit('user disconnected');
 });
});



module.exports = router;
