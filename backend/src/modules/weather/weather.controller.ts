import { Controller, Get } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private weather: WeatherService) {}

  @Get()
  getWeather() {
    return this.weather.getWeather();
  }
}
