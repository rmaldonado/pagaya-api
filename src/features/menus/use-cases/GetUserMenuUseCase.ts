import { IMenuRepository } from '../repositories/MenuRepository.js';
import { MenuItem } from '../domain/entities/MenuItem.js';

export class GetUserMenuUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  async execute(userId: string): Promise<MenuItem[]> {
    const flatItems = await this.menuRepository.getUserAuthorizedMenus(userId);

    // Mapeo a árbol jerárquico
    const menuMap = new Map<number, MenuItem>();
    const tree: MenuItem[] = [];

    for (const item of flatItems) {
      menuMap.set(item.id, { ...item, children: [] });
    }

    for (const item of flatItems) {
      const current = menuMap.get(item.id)!;
      if (item.parentId && menuMap.has(item.parentId)) {
        menuMap.get(item.parentId)!.children!.push(current);
      } else if (!item.parentId) {
        tree.push(current);
      }
    }

    return tree;
  }
}
