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
const bookingController = require('./controllers/bookingController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

/*since heroku acts as a proxy, x-forwarded-proto header will be set*/
app.enable('trust proxy');
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1)  MIDDLEWARE
//express.json() - middleware
//middleware is a function that can modify incoming request data
//gives you access to request.body
app.use(express.static(path.join(__dirname, 'starter/public')));

// Set Security HTTP headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        'child-src': ['blob:'],
        'connect-src': ["'self'", 'https://*.mapbox.com'],
        'default-src': ["'self'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'script-src': [
          "'self'",
          'https://*.mapbox.com',
          'https://js.stripe.com',
        ],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        'worker-src': ['blob:'],
        'frame-src': ["'self'", 'https://js.stripe.com'],
      },
    },
  })
);

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
/* 
This is done here because we need the body to be raw not JSON,
which it will be JSON after app.use(express.json({ limit: '10kb' })); runs
*/
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  bookingController.webhookChecout
);

//Body parser, reading data from body into request.body
app.use(express.json({ limit: '10kb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);

//Parse Cookie header and populate req.cookies with an object keyed by the cookie names
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
app.use(cors());
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

/*app.use((request, response, next) => {
  console.log('headers12323');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; font-src 'self' https://fonts.gstatic.com/; img-src 'self'; script-src 'self' https://api.mapbox.com/mapbox-gl-js/ https://js.stripe.com/v3/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com/css/ https://api.mapbox.com/mapbox-gl-js/; frame-src 'self';"
  );
  next();
});*/

//mount routers
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.all('*', (request, response, next) => {
  //response.header('Access-Control-Allow-Origin', '*');
  //response.status(404).json({
  //  status: 'fail',
  //  message: `Can't find ${request.originalUrl} on this server`,
  //});

  next(new AppError(`Can't find ${request.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
