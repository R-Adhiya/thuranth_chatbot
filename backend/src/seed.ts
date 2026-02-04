import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VehiclesService } from './vehicles/vehicles.service';
import { ParcelsService } from './parcels/parcels.service';
import { VehicleType, VehicleStatus } from './vehicles/entities/vehicle.entity';
import { ParcelStatus, ParcelPriority } from './parcels/entities/parcel.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const vehiclesService = app.get(VehiclesService);
  const parcelsService = app.get(ParcelsService);

  console.log('🌱 Seeding database with sample data...');

  // Create sample vehicles
  const vehicles = [
    {
      registrationNumber: 'DL-01-AB-1234',
      type: VehicleType.FOUR_WHEELER,
      status: VehicleStatus.DISPATCHED,
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
    },
    {
      registrationNumber: 'DL-02-CD-5678',
      type: VehicleType.TWO_WHEELER,
      status: VehicleStatus.IN_TRANSIT,
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
    },
    {
      registrationNumber: 'DL-03-EF-9012',
      type: VehicleType.FOUR_WHEELER,
      status: VehicleStatus.DISPATCHED,
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
    },
  ];

  for (const vehicleData of vehicles) {
    try {
      await vehiclesService.create(vehicleData);
      console.log(`✅ Created vehicle: ${vehicleData.registrationNumber}`);
    } catch (error) {
      console.log(`⚠️  Vehicle ${vehicleData.registrationNumber} might already exist`);
    }
  }

  // Create sample parcels
  const parcels = [
    {
      trackingNumber: 'PKG-001-2024',
      originAddress: 'Warehouse A, Gurgaon',
      destinationAddress: 'Connaught Place, New Delhi',
      destinationLat: 28.6315,
      destinationLng: 77.2167,
      weight: 2.5,
      volume: 0.1,
      status: ParcelStatus.CREATED,
      priority: ParcelPriority.NORMAL,
      slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      carrierName: 'BlueDart Express',
      customerName: 'John Doe',
      customerPhone: '+91-9876543213',
    },
    {
      trackingNumber: 'PKG-002-2024',
      originAddress: 'Warehouse B, Noida',
      destinationAddress: 'Karol Bagh, New Delhi',
      destinationLat: 28.6519,
      destinationLng: 77.1909,
      weight: 1.8,
      volume: 0.08,
      status: ParcelStatus.DISPATCHED,
      priority: ParcelPriority.HIGH,
      slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      carrierName: 'Delhivery',
      customerName: 'Jane Smith',
      customerPhone: '+91-9876543214',
      originalVehicleId: null, // Will be set after vehicles are created
    },
    {
      trackingNumber: 'PKG-003-2024',
      originAddress: 'Warehouse C, Faridabad',
      destinationAddress: 'Lajpat Nagar, New Delhi',
      destinationLat: 28.5677,
      destinationLng: 77.2431,
      weight: 3.2,
      volume: 0.15,
      status: ParcelStatus.CREATED,
      priority: ParcelPriority.URGENT,
      slaDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      carrierName: 'FedEx',
      customerName: 'Rahul Gupta',
      customerPhone: '+91-9876543215',
    },
  ];

  for (const parcelData of parcels) {
    try {
      await parcelsService.create(parcelData);
      console.log(`✅ Created parcel: ${parcelData.trackingNumber}`);
    } catch (error) {
      console.log(`⚠️  Parcel ${parcelData.trackingNumber} might already exist`);
    }
  }

  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('Sample data created:');
  console.log('- 3 vehicles with different types and statuses');
  console.log('- 3 parcels with different priorities and destinations');
  console.log('');
  console.log('You can now:');
  console.log('1. View the dashboard at http://localhost:3000');
  console.log('2. Check API endpoints at http://localhost:3001/api/docs');
  console.log('3. Test consolidation scenarios');

  await app.close();
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});