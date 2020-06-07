const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const path = require('path');
const session = require('express-session');

const PORT = process.env.PORT || 3002;

var sess; 
const config = require('./config/db');
mongoose.set('useCreateIndex', true);

mongoose.connect(config.db, {
        useNewUrlParser: true,
        useUnifiedTopology: true 
    })
    .then(() => {
        console.log(' Connecté à la base de donnés ' + config.db);
    }).catch(err => {
        console.log(err);
    });

    const app = express();
    
const corsOption = {
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['x-auth-token']
};
    app.use(cors(corsOption)); 
    app.use(session({secret: 'ssshhhhh',saveUninitialized: true,resave: true}));
    app.use(express.static(path.join(__dirname, 'public')));
    //app.use(express.static("./page"))
    app.use(bodyParser.json());
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(bodyParser.urlencoded({'extended':false}));
    mongoose.Promise = global.Promise;


    const checkUserType = function (req, res, next) {
    const userType = req.originalUrl.split('/')[2];

    require('./config/passport')(userType, passport);
    next();
};


app.use(checkUserType); 


const user = require("./controllers/user")
app.use('/api/user', user);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});