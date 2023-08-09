require('dotenv').config();
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, 'src'));
const cors = require('cors');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const router = require('routes');

app.use(cors({ origin: '*' }));
app.use(express.json({}));
app.use(express.urlencoded({ extended: false }));

app.use(router);

http.listen(process.env.PORT || 3000);
