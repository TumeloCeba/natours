const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (request, response, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();
  // 2) Build template
  // 3) Render that template using tour data from 1)
  response.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (request, response, next) => {
  const { slug } = request.params;

  if (!slug) {
    //next();
  }

  const tour = await Tour.findOne({ slug: slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  response.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = catchAsync(async (request, response, next) => {
  response.status(200).render('login', {
    title: 'Log into your account',
  });
});

exports.getAccount = (request, response) => {
  response.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (request, response, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: request.user._id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((element) => element.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });

  response.status(200).render('overview', {
    title: 'My tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (request, response, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    request.user._id,
    {
      name: request.body.name,
      email: request.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  response.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});

//response.locals.variableName makes the variable available across all pages
exports.alerts = (request, response, next) => {
  const { alert } = request.query;
  if (alert === 'booking')
    response.locals.alert = `Your booking was successful, Please check your email for confirmation, If your booking doesn't show up here immediately, please come back later.`;

  next();
};
