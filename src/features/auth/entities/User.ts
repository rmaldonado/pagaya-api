export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface AuthSession {
  user: User;
  token: string;
}
