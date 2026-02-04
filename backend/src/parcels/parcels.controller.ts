import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParcelsService } from './parcels.service';

@Controller('parcels')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  create(@Body() createParcelDto: any) {
    return this.parcelsService.create(createParcelDto);
  }

  @Get()
  findAll() {
    return this.parcelsService.findAll();
  }

  @Get('pending')
  getPendingParcels() {
    return this.parcelsService.getPendingParcels();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parcelsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParcelDto: any) {
    return this.parcelsService.update(id, updateParcelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parcelsService.remove(id);
  }
}