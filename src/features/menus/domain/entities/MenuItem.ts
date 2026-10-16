export interface MenuItem {
  id: number;
  parentId: number | null;
  title: string;
  route: string | null;
  icon: string | null;
  orderIndex: number;
  children?: MenuItem[];
}
