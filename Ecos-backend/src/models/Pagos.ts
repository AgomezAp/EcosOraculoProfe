import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}
const stripe = new Stripe(process.env.SECRET_KEY!);
const calculateOrderAmount = (items: any[]) => {
  let total = 0;

  if (!items || !items.length) {
    console.log("Warning: Empty items array");
    return 1000; // Default amount in cents (e.g., $10.00)
  }

  items.forEach((item: any) => {
    if (item && typeof item.amount === "number") {
      total += item.amount;
    } else {
      console.log("Warning: Item without valid amount", item);
    }
  });

  // Ensure minimum amount (Stripe requires at least 50 cents in most currencies)
  return Math.max(total, 100);
};

export const createPaymentIntentModel = async (
  items: any[],
  customerInfo: CustomerInfo
) => {
  try {
    // Crear o buscar un cliente en Stripe
    const customers = await stripe.customers.list({
      email: customerInfo.email,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      // Cliente existente
      customer = customers.data[0];
      // Actualizar información si es necesario
      await stripe.customers.update(customer.id, {
        name: customerInfo.name,
        phone: customerInfo.phone,
      });
    } else {
      // Crear nuevo cliente
      customer = await stripe.customers.create({
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
      });
    }

    // Crear el PaymentIntent con la información del cliente
    return await stripe.paymentIntents.create({
      amount: calculateOrderAmount(items),
      currency: "eur",
      customer: customer.id,
      payment_method_types: ["card"],
      metadata: {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
      },
      receipt_email: customerInfo.email,
    });
  } catch (error) {
    console.error("Error creating payment intent with customer info:", error);
    throw error;
  }
};
