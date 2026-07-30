import { PartialType } from '@nestjs/mapped-types';
import { CreateEmojiItemDto } from './create-emoji-item.dto';

export class UpdateEmojiItemDto extends PartialType(CreateEmojiItemDto) {}
