import { Controller, Get, Req } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private weather: WeatherService) {}

  @Get()
  getWeather(@Req() req: { ip?: string }) {
    return this.weather.getWeather(req?.ip);
  }
}
