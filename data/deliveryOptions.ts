import { DeliveryOption } from '../types/storefront';

// Real delivery logistics methods available on FLOATE nationwide
export const DEFAULT_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'motor-park',
    name: 'Interstate Motor Park Waybill',
    description: 'Direct driver dispatch from commercial market hub to your nearest designated transport park.',
    fee: 3500,
    estimatedTime: '24 - 48 Hours'
  },
  {
    id: 'gig-courier',
    name: 'Doorstep Courier (GIG / Speedaf)',
    description: 'Tracked commercial courier delivered right to your home or office address.',
    fee: 6500,
    estimatedTime: '2 - 3 Working Days'
  },
  {
    id: 'physical-pickup',
    name: 'Physical Market Stall Pickup',
    description: 'Inspect item physically at the merchant market stall before release.',
    fee: 0,
    estimatedTime: 'Same Day'
  }
];
