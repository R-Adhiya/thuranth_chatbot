import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcel, ParcelStatus } from './entities/parcel.entity';

@Injectable()
export class ParcelsService {
  constructor(
    @InjectRepository(Parcel)
    private parcelRepository: Repository<Parcel>,
  ) {}

  async create(createParcelDto: any): Promise<Parcel> {
    const parcel = this.parcelRepository.create(createParcelDto);
    const savedParcel = await this.parcelRepository.save(parcel);
    return Array.isArray(savedParcel) ? savedParcel[0] : savedParcel;
  }

  async findAll(): Promise<Parcel[]> {
    return this.parcelRepository.find();
  }

  async findOne(id: string): Promise<Parcel> {
    return this.parcelRepository.findOne({
      where: { id },
    });
  }

  async findByStatus(status: ParcelStatus): Promise<Parcel[]> {
    return this.parcelRepository.find({
      where: { status },
      relations: ['originalVehicle', 'executingVehicle'],
    });
  }

  async update(id: string, updateParcelDto: any): Promise<Parcel> {
    await this.parcelRepository.update(id, updateParcelDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.parcelRepository.delete(id);
  }

  async getPendingParcels(): Promise<Parcel[]> {
    return this.parcelRepository.find({
      where: [
        { status: ParcelStatus.CREATED },
        { status: ParcelStatus.DISPATCHED },
      ],
    });
  }
}