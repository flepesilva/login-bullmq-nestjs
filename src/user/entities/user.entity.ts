import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  /**
   * @deprecated Use avatarKey instead. This field will be removed in future version.
   * Kept temporarily for backward compatibility during migration.
   */
  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  avatarKey?: string; // S3 key for private avatar (e.g., "avatars/user-123-1234567890.jpg")

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ nullable: true, type: 'text' })
  hashedRefreshToken?: string | null;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // Añadir una columna para marcar si un usuario es de OAuth
  @Column({ default: false })
  isOAuthUser: boolean;
}
