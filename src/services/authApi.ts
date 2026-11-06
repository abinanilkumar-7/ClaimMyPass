import { apiUrl } from "./api";
const API_BASE_URL = apiUrl("/api/auth");

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface LoginData {
  email: string;
  password: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.detail ||
      data.email?.[0] ||
      data.password?.[0] ||
      data.password_confirm?.[0] ||
      data.name?.[0] ||
      data.non_field_errors?.[0] ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}

export async function signup(
  details: SignupData
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("register/", {
    method: "POST",
    body: JSON.stringify(details),
  });

  saveSession(result);
  return result;
}

export async function login(
  details: LoginData
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("login/", {
    method: "POST",
    body: JSON.stringify(details),
  });

  saveSession(result);
  return result;
}

function saveSession(result: AuthResponse): void {
  localStorage.setItem("claimmypass_token", result.token);
  localStorage.setItem(
    "claimmypass_user",
    JSON.stringify(result.user)
  );
}

export function getToken(): string | null {
  return localStorage.getItem("claimmypass_token");
}

export function getStoredUser(): AuthUser | null {
  const value = localStorage.getItem("claimmypass_user");

  if (!value) return null;

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    localStorage.removeItem("claimmypass_user");
    return null;
  }
}

export async function fetchProfile(): Promise<AuthUser> {
  const token = getToken();

  if (!token) {
    throw new Error("You are not logged in.");
  }

  return request<AuthUser>("profile/", {
    method: "GET",
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function logout(): Promise<void> {
  const token = getToken();

  try {
    if (token) {
      await request<{ message: string }>("logout/", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
      });
    }
  } finally {
    localStorage.removeItem("claimmypass_token");
    localStorage.removeItem("claimmypass_user");
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ message: string }> {
  return request<{ message: string }>("password-reset/", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function confirmPasswordReset(data: {
  uid: string;
  token: string;
  password: string;
  password_confirm: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>("password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}