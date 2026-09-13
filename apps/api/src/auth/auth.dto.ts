import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsString()
  @Length(1, 200)
  password: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

export class MfaDto {
  @IsString()
  @MaxLength(1000)
  mfaToken: string;

  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app' })
  code: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, 200)
  currentPassword: string;

  @IsString()
  @MinLength(12, { message: 'Use at least 12 characters' })
  @MaxLength(200)
  newPassword: string;
}

export class TotpCodeDto {
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app' })
  code: string;
}
