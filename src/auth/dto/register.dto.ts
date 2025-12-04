import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número o carácter especial',
  })
  password: string;
}
