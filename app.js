const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');

const {ensureAuthenticated} = require('./helpers/auth');

const app = express();

// Global promise
mongoose.Promise = global.Promise;

// Connect to mongoose
mongoose.connect('mongodb://localhost/spu-nas-web', {
   useNewUrlParser: true
})
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

// Load Subscribers model
require('./models/Subscriber');
const Subscriber = mongoose.model('subscribers');

// Load User model
require('./models/User');
const User = mongoose.model('users');

// Handlebars Middleware
app.set('views', path.join(__dirname, '/views'));
app.engine('handlebars', exphbs({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Method override middleware
app.use(methodOverride('_method'));

// Express session middleware
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Global variables
app.use(function(req, res, next){
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Passport Config
require('./config/passport')(passport);

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// About route
app.get('/about', (req, res) => {
  res.render('about');
});

// Departments route
app.get('/departments', (req, res) => {
  res.render('departments');
});

// APS route
app.get('/aps', (req, res) => {
  res.render('aps');
});

// Staff route
app.get('/staff', (req, res) => {
  res.render('staff');
});

// Students route
app.get('/students', (req, res) => {
  res.render('students');
});

// Contact route
app.get('/contact', (req, res) => {
  res.render('contact');
});

// Admin route
app.get('/myadmin', ensureAuthenticated, (req, res) => {
  Subscriber.find({})
    .sort({
      date: 'desc'
    })
    .then(subscribers => {
      res.render('myadmin/index', {
        subscribers:subscribers
      });
    });
});

// Edit subcribers route
app.get('/myadmin/edit/:id', ensureAuthenticated, (req, res) => {
  Subscriber.findOne({
    _id: req.params.id
  })
    .then(subscribers => {
        res.render('myadmin/edit', {
          subscribers:subscribers
        });
    });
});

// Process form
app.post('/', (req, res) => {
  let errors = [];

  if(!req.body.firstName){


      errors.push({text:'Please enter first name'});
    }
    if(!req.body.lastName){
      errors.push({text:'Please enter last name'});
    }
    if(!req.body.email){
      errors.push({text:'Please add email'});
    }

    if(errors.length > 0){
    res.render('contact', {
      errors: errors,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email
    });
  } else {
    const newSubscriber = {
      "first_name": req.body.firstName,
      "last_name": req.body.lastName,
      "email": req.body.email
    }
    new Subscriber(newSubscriber)
    .save()
    .then(() => {
      req.flash('success_msg', 'Form submission successful!');
      res.redirect('/contact');
    })
  }
});


// Edit Form Process
app.put('/myadmin/edit/:id', ensureAuthenticated, (req, res) => {
  Subscriber.findOne({
    _id: req.params.id
  })
  .then(subscribers => {
    // new values
    subscribers.first_name = req.body.firstName;
    subscribers.last_name = req.body.lastName;
    subscribers.email = req.body.email;

    subscribers.save()
      .then(subscribers => {
        req.flash('success_msg', 'Subscriber has been updated!');
        res.redirect('/myadmin');
      })
  });
});

// Delete Idea
app.delete('/myadmin/edit/:id', ensureAuthenticated, (req, res) => {
  Subscriber.remove({_id: req.params.id})
    .then(() => {
      req.flash('success_msg', 'Subscriber removed!');
      res.redirect('/myadmin');
    });
});

// User login route
app.get('/users/login', (req, res) => {
  res.render('users/login');
});

// User Register Route
app.get('/users/register', (req, res) => {
  res.render('users/register');
});

// Login Form POST
app.post('/users/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect:'/myadmin',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Register form POST
app.post('/users/register',(req, res) => {
  let errors = [];

  if (req.body.password != req.body.password2) {
    errors.push({text:'Passwords do not match!'});
  }

  if (req.body.password.length < 4) {
    errors.push({text:'Passwords must be at least 4 characters!'});
  }

  if (errors.length > 0) {
    res.render('users/register', {
      errors: errors,
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      password2: req.body.password2
    });
  } else {
    User.findOne({email: req.body.email})
      .then(user => {
        if(user){
          req.flash('error_msg', 'Email already regsitered!');
          res.redirect('/users/register');
        } else {
          const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
          });

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if(err) throw err;
              newUser.password = hash;
              newUser.save()
                .then(user => {
                  req.flash('success_msg', 'You are now registered and can log in.');
                  res.redirect('/users/login');
                })
                .catch(err => {
                  console.log(err);
                  return;
                });
            });
          });
        }
      });
  }
});

// Logout User
app.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out.');
  res.redirect('/users/login');
});

// Start server
const port = 5000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
