import { Role } from '../../common/enums/role.enum';

export type CurrentUser = {
  id: number;
  role: Role;
};
