import { PartialType } from '@nestjs/mapped-types';
import { CreateAiModelConfigDto } from './create-ai-model-config.dto';

export class UpdateAiModelConfigDto extends PartialType(CreateAiModelConfigDto) {}
