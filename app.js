const path = require('path');
const express = require('express');
const morgan = require('morgan');

//Security
const expressRateLimit = require('express-rate-limit');
const helmet = require('helmet');
const expressMongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();



app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1)  MIDDLEWARE
//express.json() - middleware
//middleware is a function that can modify incoming request data
//gives you access to request.body
app.use(express.static(path.join(__dirname, 'starter/public')));

// Set Security HTTP headers
//app.use(helmet());

// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = expressRateLimit({
  max: 100,
  windowsMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});

app.use('/api', limiter);

//Body parser, reading data from body into request.body
app.use(express.json({ limit: '10kb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);
app.use(cookieParser());

//Data sanitization agains NoSQL query injection
app.use(expressMongoSanitize());

//Sata sanitization against XSS
app.use(xssClean());

//Prevent parameter pollution
//Use towards the end
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());

app.use((request, response, next) => {
  request.requestTime = new Date().toISOString();
  next();
});

//3) ROUTES

//sub application
const corsOptions = {
  origin: true,
  credentials: true,
};

app.options('*', cors(corsOptions));

//mount routers
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.all('*', (request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*');
  //response.status(404).json({
  //  status: 'fail',
  //  message: `Can't find ${request.originalUrl} on this server`,
  //});

  next(new AppError(`Can't find ${request.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
