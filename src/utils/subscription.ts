// import { useStripe } from '@stripe/stripe-react-native';
// import api from '@/services/api';
// import { useSession } from '@/contexts/AuthContext';

// export async function handleSubscription() {
//   const { userInfo } = useSession();
//   const { initPaymentSheet, presentPaymentSheet } = useStripe();
//   const response = await api.post(
//     '/payment/payment_intent',
//     {},
//     {
//       headers: {
//         Authorization: `Bearer ${userInfo?.token}`,
//       },
//     },
//   );

//   const client_secret =
//     'pi_3R7zeRHGJ1Rp3sOw0El7bZu3_secret_PDVpF20WqUvK9Llq2pmKqGtqm';
//   console.log(client_secret);

//   if (!client_secret) {
//     console.error('Erro: client_secret não foi retornado.');
//     return;
//   }

//   const { error } = await initPaymentSheet({
//     merchantDisplayName: 'Memobelc',
//     paymentIntentClientSecret: client_secret,
//   });

//   if (error) {
//     console.error('Erro ao inicializar o PaymentSheet:', error);
//     return;
//   }

//   const { error: paymentError } = await presentPaymentSheet();

//   if (paymentError) {
//     console.error('Erro ao exibir o PaymentSheet:', paymentError);
//   } else {
//     console.log('Pagamento realizado com sucesso!');
//   }
// }
