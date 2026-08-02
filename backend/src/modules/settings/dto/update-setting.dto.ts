import { Allow, IsString, IsNotEmpty } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @Allow()
  value: unknown;
}
