import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { AdjustInventoryItemDto } from './dto/adjust-inventory-item.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENT')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query('siteId') siteId?: string) {
    return this.inventoryService.findAll(siteId);
  }

  @Get('low-stock')
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.inventoryService.findByBarcode(barcode);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  create(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(dto);
  }

  @Patch(':id/adjust')
  adjustQuantity(@Param('id') id: string, @Body() dto: AdjustInventoryItemDto) {
    return this.inventoryService.adjustQuantity(id, dto.delta);
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
