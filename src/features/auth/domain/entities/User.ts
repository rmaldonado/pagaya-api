export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UserSessionData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
}
