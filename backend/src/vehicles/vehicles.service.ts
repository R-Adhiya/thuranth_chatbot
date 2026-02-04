import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(createVehicleDto: any): Promise<Vehicle> {
    const vehicle = this.vehicleRepository.create(createVehicleDto);
    const savedVehicle = await this.vehicleRepository.save(vehicle);
    return Array.isArray(savedVehicle) ? savedVehicle[0] : savedVehicle;
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehicleRepository.find();
  }

  async findOne(id: string): Promise<Vehicle> {
    return this.vehicleRepository.findOne({ where: { id } });
  }

  async findActiveVehicles(): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: [
        { status: VehicleStatus.DISPATCHED },
        { status: VehicleStatus.IN_TRANSIT },
      ],
    });
  }

  async update(id: string, updateVehicleDto: any): Promise<Vehicle> {
    await this.vehicleRepository.update(id, updateVehicleDto);
    return this.findOne(id);
  }

  async updateLocation(id: string, lat: number, lng: number): Promise<Vehicle> {
    await this.vehicleRepository.update(id, {
      currentLat: lat,
      currentLng: lng,
      lastLocationUpdate: new Date(),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.vehicleRepository.delete(id);
  }

  async getVehicleStats() {
    const total = await this.vehicleRepository.count();
    const active = await this.vehicleRepository.count({
      where: [
        { status: VehicleStatus.DISPATCHED },
        { status: VehicleStatus.IN_TRANSIT },
      ],
    });

    const avgUtilization = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .select('AVG((vehicle.currentWeight / vehicle.maxWeight) * 100)', 'avg')
      .getRawOne();

    return {
      total,
      active,
      avgUtilization: parseFloat(avgUtilization.avg) || 0,
    };
  }
}