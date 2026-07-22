import { Injectable } from '@nestjs/common';

@Injectable()
export class WeatherService {
  async getWeather() {
    return {
      temperature: 28,
      condition: '晴',
      city: '北京',
      humidity: 45,
      wind: '3级',
    };
  }
}
