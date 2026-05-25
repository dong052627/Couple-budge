import {
  Utensils,
  CupSoda,
  ShoppingBag,
  Car,
  Home,
  Flame,
  Gamepad2,
  Compass,
  Gift,
  MoreHorizontal,
  LucideProps
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number | string;
}

export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  switch (name) {
    case 'Utensils':
      return <Utensils {...props} />;
    case 'CupSoda':
      return <CupSoda {...props} />;
    case 'ShoppingBag':
      return <ShoppingBag {...props} />;
    case 'Car':
      return <Car {...props} />;
    case 'Home':
      return <Home {...props} />;
    case 'Flame':
      return <Flame {...props} />;
    case 'Gamepad2':
      return <Gamepad2 {...props} />;
    case 'Compass':
      return <Compass {...props} />;
    case 'Gift':
      return <Gift {...props} />;
    default:
      return <MoreHorizontal {...props} />;
  }
}
