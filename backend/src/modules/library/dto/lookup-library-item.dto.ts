import { IsIn, IsString, MaxLength } from 'class-validator';

export class LookupLibraryItemDto {
  @IsIn(['book', 'film'])
  type: 'book' | 'film';

  @IsString()
  @MaxLength(255)
  title: string;
}
