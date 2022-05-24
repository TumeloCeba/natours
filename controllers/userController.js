//File uploads
const multer = require('multer');
//Image processing library
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
/*
const multerStorage = multer.diskStorage({
  destination: (request, file, cb) => {
    cb(null, 'starter/public/img/users');
  },
  filename: (request, file, cb) => {
    //user-id-timestamp.extention
    const extension = file.mimetype.split('/')[1];
    cb(null, `user-${request.user._id}-${Date.now()}.${extension}`);
  },
});
*/

//Stored as a buffer | This is if you need to do some image processing
const multerStorage = multer.memoryStorage();

const multerFilter = (request, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (request, response, next) => {
  if (!request.file) return next();

  request.file.filename = `user-${request.user._id}-${Date.now()}.jpeg`;

  //Actual Image Processing
  await sharp(request.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({
      quality: 90,
    })
    .toFile(`starter/public/img/users/${request.file.filename}`);

  next();
});

const filteredObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((element) => {
    if (allowedFields.includes(element)) {
      newObj[element] = obj[element];
    }
  });

  return newObj;
};

exports.getMe = (request, response, next) => {
  request.params.id = request.user._id;
  next();
};

exports.updateMe = catchAsync(async (request, response, next) => {
  // 1) Create error if user POSTs password data
  if (request.body.password || request.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please user updateMyPassword',
        400
      )
    );
  }
  // 2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filteredObj(request.body, 'name', 'email');
  if (request.file) filteredBody.photo = request.file.filename;
  const UpdatedUser = await User.findByIdAndUpdate(
    request.user._id,
    filteredBody,
    { new: true, runValidators: true }
  );
  response.status(200).json({
    status: 'success',
    data: {
      user: UpdatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (request, response, next) => {
  await User.findByIdAndUpdate(request.user._id, { active: false });
  response.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (request, response) => {
  response.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! please user /signUp',
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

//Do NOT update passwords with this because all the save middleware is not run
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
