import { Module } from '@nestjs/common';
import { GeoModule } from '../geo/geo.module';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [GeoModule],
  controllers: [WeatherController],
  providers: [WeatherService],
})
export class WeatherModule {}
