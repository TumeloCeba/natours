/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  try {
    const stripe = Stripe(
      'pk_test_51KXZH0DH1JRyagpEzkKAEShB87NLvOVBu9WbGSyQmbLtAkxsRH8ql1gNVk3FZtItsGvtEr0BwMxiWchiSLS6xR4V00bBo72eQS'
    );
    // 1) Get checkout session from API
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}`
      //`http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );

    // 2) Checkout form + charge credit cart
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (error) {
    console.log(error);
    showAlert(error, error);
  }
  c;
};
