const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const document = await Model.findByIdAndDelete(request.params.id);

    if (!document)
      return next(
        new AppError(`No document found with id:${request.params.id}`, 404)
      );

    response.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const document = await Model.findByIdAndUpdate(
      request.params.id,
      request.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!document)
      return next(
        new AppError(`No document found with id:${request.params.id}`, 404)
      );

    response.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const document = await Model.create(request.body);
    //tour.save()
    response.status(201).json({
      status: 'success',
      data: document,
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (request, response, next) => {
    let query = Model.findById(request.params.id);

    if (populateOptions) query = query.populate(populateOptions);
    const document = await query;
    if (!document) {
      return next(
        new AppError(`No document found with id:${request.params.id}`, 404)
      );
    }

    response.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (request, response, next) => {
    //To allow for nested GET reviews on tour (hack)
    const filter = request.params.tourId ? { tour: request.params.tourId } : {};

    //EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), request.query)
      .filter()
      .sort()
      .project()
      .paginate();

    //This is to get the query stats
    //const document = await features.query.explain();
    const document = await features.query;

    response.status(200).json({
      status: 'success',
      results: document.length,
      data: {
        data: document,
      },
    });
  });
