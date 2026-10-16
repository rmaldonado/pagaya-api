export interface LoginDto {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

export interface LoginResultDto {
  success: boolean;
  message: string;
  userId?: string;
  userName?: string;
  email?: string;
  sessionToken?: string;
}
