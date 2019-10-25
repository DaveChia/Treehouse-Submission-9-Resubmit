'use strict';
// load modules
const express = require('express');
const users = [];
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
var auth = require('basic-auth');
var http = require('http');
const { check, validationResult } = require('express-validator');
const nameValidator = check('name')
  .exists({ checkNull: true, checkFalsy: true })
  .withMessage('Please provide a value for "name"');


// Create the Express app.
const app = express();

// Setup request body JSON parsing.
app.use(express.json());

// Setup morgan which gives us HTTP request logging.
app.use(morgan('dev'));



const authenticateUser = (req, res, next) => {
  let message = null;

  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);

  // If the user's credentials are available...
  if (credentials) {
    // Attempt to retrieve the user from the data store
    // by their username (i.e. the user's "key"
    // from the Authorization header).
    const user = users.find(u => u.username === credentials.name);

    // If a user was successfully retrieved from the data store...
    if (user) {
      // Use the bcryptjs npm package to compare the user's password
      // (from the Authorization header) to the user's password
      // that was retrieved from the data store.
      const authenticated = bcrypt
        .compareSync(credentials.pass, user.password);

      // If the passwords match...
      if (authenticated) {
        console.log(`Authentication successful for username: ${user.username}`);

        // Then store the retrieved user object on the request object
        // so any middleware functions that follow this middleware function
        // will have access to the user's information.
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.username}`;
      }
    } else {
      message = `User not found for username: ${credentials.name}`;
    }
  } else {
    message = 'Auth header not found';
  }

  // If user authentication failed...
  if (message) {
    console.warn(message);

    // Return a response with a 401 Unauthorized HTTP status code.
    res.status(401).json({ message: 'Access Denied' });
  } else {
    // Or if user authentication succeeded...
    // Call the next() method.
    next();
  }
};

// Setup a friendly greeting for the root route.
app.get('/', (req, res) => {

});

app.get('/api/users', authenticateUser, (req, res) => {

  const user = req.currentUser;
  (async () => {

    try {
      await sequelize.authenticate();

      const findUser = await User.findOne({
        where: { emailAddress: user.username },
        attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
        include: [
          {
            model: Course,
            as: 'student',
          },
        ],
      });

      res.json({
        result: findUser,
      });

      res.end();

    } catch (error) {

      if (error.name === 'SequelizeValidationError') {

        sendErrorMsg(error);

      } else {
        console.error('Error connecting to the database: ', error);

      }

    }
  })();
});



app.post('/api/users', [
  check('name')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "name"'),
  check('username')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "username"'),
  check('password')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "password"'),
], (req, res) => {
  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {
    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    return res.status(400).json({ errors: errorMessages });
  }

  // Get the user from the request body.
  const user = req.body;

  // Hash the new user's password.
  user.password = bcrypt.hashSync(user.password);

  // Add the user to the `users` array.
  users.push(user);

  (async () => {

    try {
      await sequelize.authenticate();

      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(user.password, salt, function (err, hash) {
          // Store hash in your password DB.
          (async () => {

            const findEmailExist = await User.findOne({ where: { emailAddress: user.username } });

            if (!findEmailExist) {

              await User.create({

                firstName: user.name
                , lastName: user.name,
                emailAddress: user.username,
                password: hash

              });

              return res.status(201).location('/').end();

            } else {

              return res.status(400).end();

            }

          })();

        });
      });


    } catch (error) {

      if (error.name === 'SequelizeValidationError') {

        sendErrorMsg(error);

      } else {
        console.error('Error connecting to the database: ', error);

      }

    }
  })();

});



app.get('/api/courses', (req, res) => {
  (async () => {

    try {
      await sequelize.authenticate();

      const coursesRes = await Course.findAll({
        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
          },
        ],
      });

      return res.status(200).json({ result: coursesRes, });

    } catch (error) {
      if (error.name === 'SequelizeValidationError') {

        sendErrorMsg(error);

      } else {
        console.error('Error connecting to the database: ', error);

      }
    }
  })();
});


app.post('/api/courses', [
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"'),
], authenticateUser, (req, res) => {

  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {
    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    return res.status(400).json({ errors: errorMessages });
  }

  (async () => {

    try {
      await sequelize.authenticate();

      // Get the user from the request body.
      const user = req.body;
      const findUser = await User.findOne({ where: { emailAddress: user.username } });

      await Course.create({
        title: user.title,
        description: user.description,
        userId: findUser.id,
      })

      return res.status(201).location('/api/courses/' + findUser.id).end();

    } catch (error) {
      if (error.name === 'SequelizeValidationError') {

        sendErrorMsg(error);

      } else {
        console.error('Error connecting to the database: ', error);

      }
    }
  })();

});

app.get('/api/courses/:id', (req, res) => {

  let queryID = (req.param("id"));
  queryID = queryID.replace(":", "");

  (async () => {

    try {
      await sequelize.authenticate();

      const courseByID = await Course.findByPk(queryID, {

        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
          },
        ],

      });

      return res.status(200).json({ result: courseByID, });

    } catch (error) {
      if (error.name === 'SequelizeValidationError') {

        sendErrorMsg(error);

      } else {
        console.error('Error connecting to the database: ', error);

      }
    }
  })();
});


app.put('/api/courses/:id', [
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"'),
], authenticateUser, (req, res) => {

  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {
    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    return res.status(400).json({ errors: errorMessages });
  }

  let queryID = (req.param("id"));
  queryID = queryID.replace(":", "");

  (async () => {

    try {
      await sequelize.authenticate();
      // Get the user from the request body.
      const user = req.body;
      const courseByID = await Course.findByPk(queryID, {

        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
          },
        ],

      });

      if (courseByID.student.emailAddress === user.emailAddress) {

        courseByID.title = user.title;
        courseByID.description = user.description;
        await courseByID.save();

        return res.status(204).end();

      } else {

        return res.status(403).end();

      }


    } catch (error) {
      if (error.name === 'SequelizeValidationError') {

        sendErrorMsg(error);

      } else {
        console.error('Error connecting to the database: ', error);

      }
    }
  })();
});

app.delete('/api/courses/:id', authenticateUser, (req, res) => {

  let queryID = (req.param("id"));
  queryID = queryID.replace(":", "");

  (async () => {

    try {
      await sequelize.authenticate();
      // Get the user from the request body.
      const user = req.body;
      const courseByID = await Course.findByPk(queryID, {

        attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
          },
        ],

      });

      if (courseByID.student.emailAddress === user.emailAddress) {

        await courseByID.destroy();
        return res.status(204).end();

      } else {

        return res.status(403).end();

      }

    } catch (error) {
      if (error.name === 'SequelizeValidationError') {

        sendErrorMsg(error);

      } else {
        console.error('Error connecting to the database: ', error);

      }
    }
  })();
});








// Send 404 if no other route matched.
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// Setup a global error handler.
app.use((err, req, res, next) => {
  console.error(`Global error handler: ${JSON.stringify(err.stack)}`);

  res.status(500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err,
  });
});

// Set our port.
app.set('port', process.env.PORT || 5000);

// Start listening on our port.
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});






const { sequelize, models } = require('./db');

// Get references to our models.
const { User, Course } = models;

(async () => {
  try {
    // Test the connection to the database
    console.log('Connection to the database successful!');
    await sequelize.authenticate();

    // Sync the models
    console.log('Synchronizing the models with the database...');
    await sequelize.sync({ force: true });

    // process.exit();
  } catch (error) {

    console.error('Error connecting to the database: ', error);

    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message);
      console.error('Validation errors: ', errors);
    } else {
      throw error;
    }
  }
})();

function sendErrorMsg(inputError) {

  console.log(inputError);
  res.end();

}