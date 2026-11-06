import { apiUrl } from "./api";
import { getToken } from "./authApi";

const API_URL = apiUrl("/api/movies/shows/");

export interface ApiSeat {
  id: number;
  show: number;
  row: string;
  number: number;
  tier: "standard" | "premium" | "vip";
  price: string;
  status: "available" | "held" | "booked";
}

export interface SeatHoldResponse {
  hold_token: string;
  seat_ids: number[];
  expires_at: string;
}

export async function fetchSeats(showId: number): Promise<ApiSeat[]> {
  const response = await fetch(`${API_URL}${showId}/seats/`);

  if (!response.ok) {
    throw new Error(`Failed to load seats (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createSeatHold(
  showId: number,
  seatIds: number[],
  holdToken?: string
): Promise<SeatHoldResponse> {
  const token = getToken();

  if (!token) {
    throw new Error("Please sign in to reserve seats.");
  }
  const response = await fetch(`${API_URL}${showId}/hold/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      seat_ids: seatIds,
      ...(holdToken ? { hold_token: holdToken } : {}),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
    data.error || data.detail || "Unable to reserve these seats."
    );
  }

  return data;
}

export async function releaseSeatHold(
  showId: number,
  holdToken: string,
  seatIds?: number[]
): Promise<void> {
  const token = getToken();

  if (!token) {
    throw new Error("Please sign in to release held seats.");
  }

  const response = await fetch(`${API_URL}${showId}/hold/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      hold_token: holdToken,
      ...(seatIds ? { seat_ids: seatIds } : {}),
    }),
  });

  if (!response.ok) {
    let message = "Unable to release the seat hold.";

    try {
      const data = await response.json();
      message = data.error || data.detail || message;
    } catch {
      // Keep the default message if the response has no JSON body.
    }

    throw new Error(`${message} (HTTP ${response.status})`);
  }
}
