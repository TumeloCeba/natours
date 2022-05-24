const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

//mergeParams gives us access to tourId
const router = express.Router();

router.use(authController.protect);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .post(bookingController.createOne)
  .get(bookingController.getAll);

router
  .route('/:id')
  .get(bookingController.getOne)
  .patch(bookingController.updateOne)
  .delete(bookingController.deleteOne);

module.exports = router;
