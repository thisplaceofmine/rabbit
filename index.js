const http = require('http');
const { castArray } = require('lodash');

const msg = require('./msg');
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const path = ['query', 'params', 'body', 'docs'];
  const paths = castArray(path);

  req.attrs = Object.assign(
    {},
    ...paths.map((p) => {
      const d = req[p];
      if (Buffer.isBuffer(d)) return { buffer: d };
      else return d;
    })
  );

  next();
});

app.use('/msg', msg);

const defaultPort = process.env.PORT || 3000;
app.set('port', defaultPort);

const server = http.createServer(app);

server.listen(defaultPort);

server.on('listening', () => {
  console.log('Listening on port ' + defaultPort);
});
