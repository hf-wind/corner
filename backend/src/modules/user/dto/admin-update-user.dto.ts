import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: 'admin' | 'user';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
