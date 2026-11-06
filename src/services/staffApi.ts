import { apiUrl } from "./api";
import { getToken } from "./authApi";

const STAFF_API_URL = apiUrl("/api/payments/tickets/check-in/");

export interface TicketCheckInResult {
    valid: boolean;
    already_used?: boolean;
    detail: string;
    booking_id?: string;
    movie?: string;
    theatre?: string;
    screen?: string;
    seats?: Array<string | number>;
    checked_in_at?: string;
    checked_in_by?: string | null;
}

interface ErrorPayload {
  detail?: string;
  already_used?: boolean;
  checked_in_at?: string;
  checked_in_by?: string | null;
  [key: string]: unknown;
}

export class StaffApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: ErrorPayload = {}
  ) {
    super(message);
    this.name = "StaffApiError";
  }
}

export async function checkInTicket(
  qrToken: string
): Promise<TicketCheckInResult> {
  const authToken = getToken();

  if (!authToken) {
    throw new StaffApiError(
      "Please sign in with your staff account.",
      401
    );
  }

  const response = await fetch(STAFF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${authToken}`,
    },
    body: JSON.stringify({
      token: qrToken.trim(),
    }),
  });

  let data: ErrorPayload = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    let message = "Ticket verification failed.";

    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (response.status === 401) {
      message = "Your staff session has expired. Please sign in again.";
    } else if (response.status === 403) {
      message = "Your account is not authorized to verify tickets.";
    } else if (response.status === 404) {
      message = "This QR code is invalid or unrecognized.";
    }

    throw new StaffApiError(message, response.status, data);
  }

  if (
  typeof data.valid !== "boolean" ||
  typeof data.detail !== "string"
) {
  throw new StaffApiError(
    "The server returned an unexpected verification response.",
    response.status,
    data
  );
}

return {
  valid: data.valid,
  detail: data.detail,

  already_used:
    typeof data.already_used === "boolean"
      ? data.already_used
      : undefined,

  booking_id:
    typeof data.booking_id === "string"
      ? data.booking_id
      : undefined,

  movie:
    typeof data.movie === "string" ? data.movie : undefined,

  theatre:
    typeof data.theatre === "string" ? data.theatre : undefined,

  screen:
    typeof data.screen === "string" ? data.screen : undefined,

  seats: Array.isArray(data.seats)
    ? data.seats.filter(
        (seat): seat is string | number =>
          typeof seat === "string" || typeof seat === "number"
      )
    : undefined,

  checked_in_at:
    typeof data.checked_in_at === "string"
      ? data.checked_in_at
      : undefined,

  checked_in_by:
    typeof data.checked_in_by === "string"
      ? data.checked_in_by
      : null,
};
}

const STAFF_ACCESS_URL = apiUrl(
    "/api/payments/staff/access/"
);

export async function verifyStaffAccess(): Promise<{
  authorized: boolean;
  username: string;
  message: string;
}> {
  const authToken = getToken();

  if (!authToken) {
    throw new StaffApiError(
      "Please sign in with your staff account.",
      401
    );
  }

  const response = await fetch(STAFF_ACCESS_URL, {
    method: "GET",
    headers: {
      Authorization: `Token ${authToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new StaffApiError(
      response.status === 403
        ? "This account does not have staff access."
        : "Staff authentication is required.",
      response.status,
      data
    );
  }

  return data;
}