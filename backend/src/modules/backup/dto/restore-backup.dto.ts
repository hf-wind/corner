import { IsString, Matches, MinLength } from 'class-validator';

export class RestoreBackupDto {
  @IsString()
  @MinLength(32)
  recoveryToken: string;

  @IsString()
  @Matches(/^RESTORE [0-9]{8}T[0-9]{6}Z$/)
  confirmation: string;
}
