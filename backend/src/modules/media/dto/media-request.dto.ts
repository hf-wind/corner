import {
  ArrayMaxSize,
  IsArray,
  IsBooleanString,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMediaFolderDto {
  @IsString()
  @MaxLength(100)
  name: string;
}

export class UploadMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  folder?: string;

  @IsOptional()
  @IsBooleanString()
  compressAnimated?: string;
}

export class ImportMediaUrlDto {
  @IsString()
  @MaxLength(4096)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  folder?: string;
}

export class MediaIdsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];
}

export class MoveMediaDto extends MediaIdsDto {
  @IsString()
  @MaxLength(100)
  folder: string;
}

export class ConfirmMediaMetadataDto {
  @IsOptional()
  @IsDateString()
  capturedAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  placeId?: string | null;
}
