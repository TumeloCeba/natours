const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (request, response, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(request.params.tourId);

  // 2) Create the checkout session

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${request.protocol}://${request.get(
      'host'
    )}/my-tours?alert=booking`,
    cancel_url: `${request.protocol}://${request.get('host')}/tour/${
      tour.slug
    }/`,
    customer_email: request.user.email,
    client_reference_id: request.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [
          'https://en.wikipedia.org/wiki/Hiking#/media/File:Hiking_to_the_Ice_Lakes._San_Juan_National_Forest,_Colorado.jpg',
        ],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3) Check the session response'
  response.status(200).json({
    status: 'success',
    session,
  });
});

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = await User.findOne({ email: session.customer_email });
  const price = session.line_items[0].amount / 100;
  await Booking.create({ tour, user: user._id, price });
};

exports.webhookChecout = (request, response, next) => {
  let event;
  try {
    const signature = request.hearders['stripe-signature'];
    event = stripe.webhooks.contructEvent(
      request.body,
      signature,
      process.env.STRIPE_WEBHOOK_SIGNING_SECRET
    );
  } catch (error) {
    return response.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }

  response.status(200).json({ received: true });
};

//CREATE
exports.createOne = factory.createOne(Booking);

//READ
exports.getOne = factory.getOne(Booking);
exports.getAll = factory.getAll(Booking);

//UPDATE
exports.updateOne = factory.updateOne(Booking);

//DELETE
exports.deleteOne = factory.deleteOne(Booking);
