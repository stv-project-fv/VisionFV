import React from 'react';
import {
  Truck,
  Tractor,
  HardHat,
  Car,
  Boxes,
  Wrench,
  Construction,
  Pickaxe,
} from 'lucide-react';
import type { VehicleCategory } from '@/types';

export function getVehicleCategoryIcon(
  category: VehicleCategory,
  className: string = 'w-5 h-5'
): React.ReactNode {
  switch (category) {
    case 'Camionetas':
      return <Car className={className} />;
    case 'Tractores':
    case 'Camiones Tractores':
    case 'Desmalezadoras':
    case 'Minicargadoras':
      return <Tractor className={className} />;
    case 'Autoelevadores':
      return <Boxes className={className} />;
    case 'Excavadoras':
    case 'Palas Cargadoras':
      return <HardHat className={className} />;
    case 'Retroexcavadoras':
      return <Pickaxe className={className} />;
    case 'Aplanadoras':
    case 'Motoniveladoras':
    case 'Terminadoras de Asfalto':
    case 'Camiones Hidroelevadores':
      return <Construction className={className} />;
    case 'Bateas':
    case 'Camiones Caja Cerrada':
    case 'Camiones Volcadores':
    case 'Carretones':
      return <Truck className={className} />;
    case 'Chipeadoras':
    case 'Otros':
    default:
      return <Wrench className={className} />;
  }
}
