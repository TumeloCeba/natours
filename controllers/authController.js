const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );

const createSendToken = (user, statusCode, request, response) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //Cookie will only be sent on HTTPS/Encrypted connection
    secure: request.secure || request.readers('x-forward-proto') === 'https',
    //Cookie cannot be moditifed by the browser to prevent cross site attacks
    httpOnly: true,
  };

  user.password = undefined;

  response.cookie('jwt', token, cookieOptions);
  response.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (request, response, next) => {
  const newUser = await User.create({
    name: request.body.name,
    email: request.body.email,
    password: request.body.password,
    passwordConfirm: request.body.passwordConfirm,
    passwordChancedAt: request.body.passwordChancedAt,
    //role: request.body.role,
  });
  const url = `${request.protocol}://${request.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, request, response);
});

exports.login = catchAsync(async (request, response, next) => {
  const { email, password } = request.body;

  //Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, request, response);
});

exports.logOut = (request, response) => {
  response.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  response.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (request, response, next) => {
  //Getting token and check if its there
  let token;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith('Bearer')
  ) {
    token = request.headers.authorization.split(' ')[1];
  } else if (request.cookies.jwt) {
    token = request.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in, please log in to get access', 401)
    );
  }

  //Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user the token belongs to no longer exists', 401)
    );
  }

  //check if user changed password after jwt token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }

  request.user = currentUser;
  response.locals.user = currentUser;
  //GRANT ACCESS TO PROTECTED ROUTE
  next();
});

exports.isLoggedIn = catchAsync(async (request, response, next) => {
  //Getting token and check if its there
  let token;
  if (request.cookies.jwt) {
    token = request.cookies.jwt;

    //Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //Check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next();
    }

    //check if user changed password after jwt token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    //there is a logged in user
    response.locals.user = currentUser;
  }
  //GRANT ACCESS TO PROTECTED ROUTE
  next();
});

exports.restrictTo =
  (...roles) =>
  (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return next(
        new AppError(
          'You do not have the permission to perform this action',
          403
        )
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (request, response, next) => {
  //1) Get user based on POSTed by email
  const user = await User.findOne({ email: request.body.email });

  if (!user) {
    return next(
      new AppError(
        `There is no user with email address ${request.body.email}`,
        404
      )
    );
  }

  //2)Generate the random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    //3) Send it to the user via email
    const resetURL = `${request.protocol}://${request.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendpasswordReset();

    response.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the mail. Try again later!', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (request, response, next) => {
  // 1) get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(request.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Invalid reset token or has expired', 400));
  }

  user.password = request.body.password;
  user.passwordConfirm = request.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // 3) Update changedPasswordAt property for the user

  await user.save();

  // 4) Log the user in, send JWT
  createSendToken(user, 200, request, response);
});

exports.updatePassword = catchAsync(async (request, response, next) => {
  // 1) Get user from collection
  const { passwordCurrent, password, passwordConfirm } = request.body;
  const user = await User.findById(request.user._id).select('+password');

  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 2) Check if POSTed current password is correct

  // 3) Update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;

  await user.save();

  // 4) Log user in, sent JWT
  createSendToken(user, 200, request, response);
});
