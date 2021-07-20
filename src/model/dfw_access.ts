import {Table, Column, Model , DataType, CreatedAt, UpdatedAt, PrimaryKey, ForeignKey, Unique, HasOne, AllowNull, BelongsTo, BelongsToMany, AutoIncrement } from 'sequelize-typescript';
import dfw_credential from './dfw_credential';
import dfw_users_credential from './dfw_users_credential';
 
@Table({ tableName: "dfw_access"})
export default class dfw_access extends Model {
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER.UNSIGNED)
    id!: number;
 
    @Unique
    @Column(DataType.STRING(32))
    name!: string;

    @Column
    description!: string;

    @CreatedAt
    created_at!: Date;

    @UpdatedAt
    updated_at!: Date;

    /// Relations
    @BelongsToMany(() => dfw_credential, {
        through: {
            model: () => dfw_users_credential,
            unique: false,
        },
        foreignKey: 'idCredential',
        constraints: false
    })
    ownedCredentials!: dfw_credential[];
}