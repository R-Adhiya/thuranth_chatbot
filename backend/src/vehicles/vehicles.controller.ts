import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@Body() createVehicleDto: any) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  findAll() {
    // Return mock data for demo purposes
    return [
      {
        id: '1',
        registrationNumber: 'DL-01-AB-1234',
        type: '4w',
        status: 'dispatched',
        driverName: 'Rajesh Kumar',
        driverPhone: '+91-9876543210',
        carrierName: 'BlueDart Express',
        maxWeight: 50,
        maxVolume: 2.5,
        currentWeight: 25,
        currentVolume: 1.2,
        currentLat: 28.6139,
        currentLng: 77.2090,
        lastLocationUpdate: new Date(),
        allowConsolidation: true,
        trustScore: 92,
        totalDeliveries: 150,
        successfulDeliveries: 145,
        lateDeliveries: 5,
        spareWeight: 25,
        spareVolume: 1.3,
        utilizationPercentage: 50,
      },
      {
        id: '2',
        registrationNumber: 'DL-02-CD-5678',
        type: '2w',
        status: 'in_transit',
        driverName: 'Amit Singh',
        driverPhone: '+91-9876543211',
        carrierName: 'Delhivery',
        maxWeight: 15,
        maxVolume: 0.5,
        currentWeight: 8,
        currentVolume: 0.3,
        currentLat: 28.5355,
        currentLng: 77.3910,
        lastLocationUpdate: new Date(),
        allowConsolidation: true,
        trustScore: 88,
        totalDeliveries: 89,
        successfulDeliveries: 85,
        lateDeliveries: 4,
        spareWeight: 7,
        spareVolume: 0.2,
        utilizationPercentage: 60,
      },
      {
        id: '3',
        registrationNumber: 'DL-03-EF-9012',
        type: '4w',
        status: 'dispatched',
        driverName: 'Priya Sharma',
        driverPhone: '+91-9876543212',
        carrierName: 'FedEx',
        maxWeight: 75,
        maxVolume: 4.0,
        currentWeight: 45,
        currentVolume: 2.8,
        currentLat: 28.7041,
        currentLng: 77.1025,
        lastLocationUpdate: new Date(),
        allowConsolidation: true,
        trustScore: 95,
        totalDeliveries: 200,
        successfulDeliveries: 198,
        lateDeliveries: 2,
        spareWeight: 30,
        spareVolume: 1.2,
        utilizationPercentage: 70,
      },
    ];
  }

  @Get('active')
  findActiveVehicles() {
    // Return mock active vehicles for demo
    return [
      {
        id: '1',
        registrationNumber: 'DL-01-AB-1234',
        type: '4w',
        status: 'dispatched',
        currentLat: 28.6139,
        currentLng: 77.2090,
        spareCapacity: 25,
        utilizationPercentage: 50,
        trustScore: 92,
      },
      {
        id: '3',
        registrationNumber: 'DL-03-EF-9012',
        type: '4w',
        status: 'dispatched',
        currentLat: 28.7041,
        currentLng: 77.1025,
        spareCapacity: 30,
        utilizationPercentage: 70,
        trustScore: 95,
      },
    ];
  }

  @Get('stats')
  getStats() {
    return this.vehiclesService.getVehicleStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVehicleDto: any) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Patch(':id/location')
  updateLocation(
    @Param('id') id: string,
    @Body() locationDto: { lat: number; lng: number },
  ) {
    return this.vehiclesService.updateLocation(id, locationDto.lat, locationDto.lng);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}