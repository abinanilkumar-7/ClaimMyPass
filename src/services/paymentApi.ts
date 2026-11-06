import { apiUrl } from "./api";
import { getToken } from "./authApi";
import type { BookingPass } from "../types";

const PAYMENT_API_URL = apiUrl("/api/payments");

export interface SandboxOrderResponse {
  message: string;
  order_id: string;
  cashfree_order_id: string;
  payment_session_id: string;
  amount: string;
  currency: string;
  status: string;
}

export interface SandboxVerificationResponse {
  order_id: string;
  status: "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";
  cashfree_order_status: string;
  amount: string;
  currency: string;
  verified: boolean;
}

async function paymentRequest<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error("Please sign in before making a payment.");
  }

  const response = await fetch(
    `${PAYMENT_API_URL}/${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.customer_phone?.[0] ||
      `Payment API failed (${response.status})`
    );
  }

  return data as T;
}

export function createSandboxTestOrder(
  customerPhone: string
): Promise<SandboxOrderResponse> {
  return paymentRequest<SandboxOrderResponse>(
    "sandbox-test-order/",
    {
      customer_phone: customerPhone,
    }
  );
}

export function verifySandboxTestOrder(
  orderId: string
): Promise<SandboxVerificationResponse> {
  return paymentRequest<SandboxVerificationResponse>(
    "sandbox-test-order/verify/",
    {
      order_id: orderId,
    }
  );
}

export interface MovieBookingOrderRequest {
  show_id: number;
  seat_ids: number[];
  hold_token: string;
  customer_phone: string;
  concessions: Record<string, number>;
}

export interface MovieBookingOrderResponse {
  message: string;
  booking_id: string;
  order_id: string;
  cashfree_order_id: string;
  payment_session_id: string;
  amount: string;
  currency: string;
  status: string;
  booking_status: string;
  price_breakdown: {
    subtotal_tickets: string;
    subtotal_concessions: string;
    convenience_fee: string;
    taxes: string;
    total_amount: string;
  };
}

export interface MovieBookingVerificationResponse {
  order_id: string;
  booking_id: string;
  payment_status: string;
  booking_status: string;
  verified: boolean;
  pass_ready: boolean;
  message: string;
}

export function createMovieBookingOrder(
  data: MovieBookingOrderRequest
): Promise<MovieBookingOrderResponse> {
  return paymentRequest<MovieBookingOrderResponse>(
    "booking/create-order/",
    data
  );
}

export function verifyMovieBookingOrder(
  orderId: string
): Promise<MovieBookingVerificationResponse> {
  return paymentRequest<MovieBookingVerificationResponse>(
    "booking/verify/",
    {
      order_id: orderId,
    }
  );
}

export async function fetchMyBookings(): Promise<BookingPass[]> {
  const token = getToken();

  if (!token) {
    throw new Error("Please sign in to view your passes.");
  }

  const response = await fetch(
    `${PAYMENT_API_URL}/my-bookings/`,
    {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json",
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Unable to load bookings (${response.status}).`
    );
  }

  return Array.isArray(data.results)
    ? data.results as BookingPass[]
    : [];
}