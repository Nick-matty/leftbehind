export type VenueType =
  | 'hotel'
  | 'airbnb'
  | 'gym'
  | 'restaurant'
  | 'office'
  | 'friends_house'
  | 'airport';

export interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  topMiss: boolean;
  category: string;
}

export interface Venue {
  id: VenueType;
  label: string;
  icon: string; // MaterialCommunityIcons name
  description: string;
  checklist: ChecklistItem[];
}

export const VENUES: Venue[] = [
  {
    id: 'hotel',
    label: 'Hotel',
    icon: 'bed-king-outline',
    description: 'Standard hotel room checkout',
    checklist: [
      { id: 'h1', label: 'Phone charger & cables', hint: 'Check outlet by bed & desk', topMiss: true, category: 'Electronics' },
      { id: 'h2', label: 'Laptop & charger', hint: 'Desk, safe, or bedside', topMiss: false, category: 'Electronics' },
      { id: 'h3', label: 'Earphones / AirPods', hint: 'Bedside table or TV unit', topMiss: false, category: 'Electronics' },
      { id: 'h4', label: 'Watch or jewelry', hint: 'Bathroom shelf, bedside', topMiss: true, category: 'Personal' },
      { id: 'h5', label: 'Razor & toothbrush', hint: 'On the sink, shower shelf', topMiss: true, category: 'Bathroom' },
      { id: 'h6', label: 'Toiletry bag', hint: 'Check entire bathroom', topMiss: false, category: 'Bathroom' },
      { id: 'h7', label: 'Jacket or hoodie', hint: 'Wardrobe, chair, back of door', topMiss: true, category: 'Clothing' },
      { id: 'h8', label: 'Shoes or sandals', hint: 'Under bed, wardrobe floor', topMiss: false, category: 'Clothing' },
      { id: 'h9', label: 'Wallet & passport', hint: 'Safe! Bedside drawer', topMiss: false, category: 'Documents' },
      { id: 'h10', label: 'Room key card', hint: 'Pocket, wallet, desk', topMiss: false, category: 'Documents' },
      { id: 'h11', label: 'Medications', hint: 'Bathroom cabinet, bedside', topMiss: true, category: 'Health' },
      { id: 'h12', label: 'Sunglasses', hint: 'Desk, bedside, windowsill', topMiss: false, category: 'Personal' },
      { id: 'h13', label: 'Books or kindle', hint: 'Bedside table', topMiss: false, category: 'Personal' },
      { id: 'h14', label: 'Gym clothes & shoes', hint: 'Wardrobe, bathroom floor', topMiss: false, category: 'Clothing' },
      { id: 'h15', label: 'Valuables from safe', hint: 'Open the safe — always check!', topMiss: true, category: 'Documents' },
    ],
  },
  {
    id: 'airbnb',
    label: 'Airbnb',
    icon: 'home-city-outline',
    description: 'Short-term rental checkout',
    checklist: [
      { id: 'a1', label: 'Phone charger & cables', hint: 'All rooms, every outlet', topMiss: true, category: 'Electronics' },
      { id: 'a2', label: 'Food you bought', hint: 'Fridge, pantry, countertop', topMiss: true, category: 'Kitchen' },
      { id: 'a3', label: 'Jacket or hoodie', hint: 'All hooks, chairs, sofas', topMiss: true, category: 'Clothing' },
      { id: 'a4', label: 'Toiletries in bathroom', hint: 'Shower, under sink, cabinet', topMiss: false, category: 'Bathroom' },
      { id: 'a5', label: 'Keys returned', hint: 'Leave in agreed spot', topMiss: false, category: 'Documents' },
      { id: 'a6', label: 'Medications', hint: 'Bedside, bathroom, kitchen', topMiss: true, category: 'Health' },
      { id: 'a7', label: 'Books, games, toys', hint: 'Living room, bedroom', topMiss: false, category: 'Personal' },
      { id: 'a8', label: 'Laptop & accessories', hint: 'Desk, living room table', topMiss: false, category: 'Electronics' },
      { id: 'a9', label: 'Sunglasses', hint: 'Outdoor table, windowsill', topMiss: false, category: 'Personal' },
      { id: 'a10', label: 'Children\'s items', hint: 'All rooms, under furniture', topMiss: false, category: 'Personal' },
    ],
  },
  {
    id: 'gym',
    label: 'Gym',
    icon: 'dumbbell',
    description: 'After a gym session',
    checklist: [
      { id: 'g1', label: 'Water bottle', hint: 'Equipment, bench, locker', topMiss: true, category: 'Gym' },
      { id: 'g2', label: 'Earphones / AirPods', hint: 'Locker, equipment', topMiss: true, category: 'Electronics' },
      { id: 'g3', label: 'Towel', hint: 'Shower, bench, locker', topMiss: false, category: 'Gym' },
      { id: 'g4', label: 'Locker padlock', hint: 'Check locker door', topMiss: false, category: 'Gym' },
      { id: 'g5', label: 'Shampoo & soap', hint: 'Shower cubicle shelf', topMiss: true, category: 'Bathroom' },
      { id: 'g6', label: 'Gym gloves or straps', hint: 'Near equipment you used', topMiss: false, category: 'Gym' },
      { id: 'g7', label: 'Wallet & keys', hint: 'Bottom of bag or locker', topMiss: false, category: 'Personal' },
      { id: 'g8', label: 'Phone charger', hint: 'Charging station, locker', topMiss: false, category: 'Electronics' },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: 'silverware-fork-knife',
    description: 'Leaving a restaurant or café',
    checklist: [
      { id: 'r1', label: 'Phone', hint: 'Under napkin, on seat', topMiss: true, category: 'Electronics' },
      { id: 'r2', label: 'Jacket or scarf', hint: 'Chair back, coat hook', topMiss: true, category: 'Clothing' },
      { id: 'r3', label: 'Umbrella', hint: 'Umbrella stand, under table', topMiss: true, category: 'Personal' },
      { id: 'r4', label: 'Bag or purse', hint: 'On the seat, floor by feet', topMiss: false, category: 'Personal' },
      { id: 'r5', label: 'Glasses (reading/sun)', hint: 'Table, jacket pocket', topMiss: false, category: 'Personal' },
      { id: 'r6', label: 'Leftovers box', hint: 'Did you ask to take it?', topMiss: false, category: 'Personal' },
      { id: 'r7', label: 'Card after paying', hint: 'Back from waiter/machine', topMiss: true, category: 'Documents' },
    ],
  },
  {
    id: 'office',
    label: 'Office',
    icon: 'office-building-outline',
    description: 'Leaving the office for the day',
    checklist: [
      { id: 'o1', label: 'Laptop & charger', hint: 'Desk, docking station', topMiss: false, category: 'Electronics' },
      { id: 'o2', label: 'Access badge / key fob', hint: 'Desk, coat pocket', topMiss: true, category: 'Documents' },
      { id: 'o3', label: 'Phone charger', hint: 'Desk outlet, drawer', topMiss: true, category: 'Electronics' },
      { id: 'o4', label: 'Water bottle', hint: 'Desk, meeting room', topMiss: false, category: 'Personal' },
      { id: 'o5', label: 'Gym bag', hint: 'Under desk, locker', topMiss: false, category: 'Personal' },
      { id: 'o6', label: 'Jacket or umbrella', hint: 'Coat rack, chair back', topMiss: false, category: 'Clothing' },
      { id: 'o7', label: 'Lunch box', hint: 'Fridge, kitchen', topMiss: true, category: 'Kitchen' },
      { id: 'o8', label: 'Notebook & pen', hint: 'Meeting room, desk', topMiss: false, category: 'Personal' },
    ],
  },
  {
    id: 'friends_house',
    label: "Friend's house",
    icon: 'home-heart',
    description: "Leaving a friend's or family home",
    checklist: [
      { id: 'f1', label: 'Charger & cables', hint: 'Guest room outlet, living room', topMiss: true, category: 'Electronics' },
      { id: 'f2', label: 'Jacket or hoodie', hint: 'Coat rack, sofa, spare room', topMiss: true, category: 'Clothing' },
      { id: 'f3', label: 'Toiletries', hint: 'Guest bathroom', topMiss: false, category: 'Bathroom' },
      { id: 'f4', label: 'Medications', hint: 'Bedside, bathroom', topMiss: true, category: 'Health' },
      { id: 'f5', label: 'Children\'s toys', hint: 'Living room, garden', topMiss: false, category: 'Personal' },
      { id: 'f6', label: 'Things you brought as gifts', hint: 'Did you mean to leave them?', topMiss: false, category: 'Personal' },
      { id: 'f7', label: 'Earphones / AirPods', hint: 'Guest room, sofa area', topMiss: false, category: 'Electronics' },
    ],
  },
  {
    id: 'airport',
    label: 'Airport / transit',
    icon: 'airplane',
    description: 'Leaving a gate, lounge, or terminal',
    checklist: [
      { id: 'ap1', label: 'Passport & boarding pass', hint: 'The obvious one — confirm now', topMiss: false, category: 'Documents' },
      { id: 'ap2', label: 'Phone & charger', hint: 'Charging station, seat pocket', topMiss: true, category: 'Electronics' },
      { id: 'ap3', label: 'Neck pillow', hint: 'Overhead bin, under seat', topMiss: true, category: 'Personal' },
      { id: 'ap4', label: 'Jacket or blanket', hint: 'Seat, overhead bin', topMiss: false, category: 'Clothing' },
      { id: 'ap5', label: 'Duty free bag', hint: 'Under seat, overhead bin', topMiss: true, category: 'Personal' },
      { id: 'ap6', label: 'Earphones / AirPods', hint: 'Seat pocket, tray table', topMiss: false, category: 'Electronics' },
      { id: 'ap7', label: 'Liquids bag (security)', hint: 'Tray at security check', topMiss: true, category: 'Documents' },
      { id: 'ap8', label: 'Snacks or water bottle', hint: 'Tray table, seat pocket', topMiss: false, category: 'Personal' },
    ],
  },
];

export function getVenueById(id: VenueType): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}
