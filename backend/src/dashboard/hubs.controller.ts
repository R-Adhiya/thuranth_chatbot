import { Controller, Get } from '@nestjs/common';

@Controller('hubs')
export class HubsController {
  @Get()
  getHubs() {
    return [
      {
        id: '1',
        name: 'Warehouse A - Gurgaon',
        lat: 28.4595,
        lng: 77.0266,
        type: 'warehouse',
      },
      {
        id: '2',
        name: 'Sorting Center - Noida',
        lat: 28.5355,
        lng: 77.3910,
        type: 'sorting_center',
      },
      {
        id: '3',
        name: 'Warehouse B - Faridabad',
        lat: 28.4089,
        lng: 77.3178,
        type: 'warehouse',
      },
    ];
  }
}