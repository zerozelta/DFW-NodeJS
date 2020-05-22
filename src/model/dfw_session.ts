import {Table, Column, Model , DataType, CreatedAt, UpdatedAt, PrimaryKey, ForeignKey, Unique, HasOne, AllowNull, BelongsTo, AutoIncrement } from 'sequelize-typescript';
import dfw_user from './dfw_user';
 
@Table({ tableName: "dfw_sessions"})
export default class dfw_session extends Model<dfw_session> {
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER.UNSIGNED)
    id!: number; 

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING(64))
    token!: string;

    @Column
    agent!: string; 

    @Column
    ip!: string;

    @Column
    site!: string;

    @Column(DataType.DATEONLY)
    expire!: Date;

    @AllowNull
    @ForeignKey(() => dfw_user)
    @Column(DataType.INTEGER.UNSIGNED)
    idUser?: number|null;

    @CreatedAt
    created_at!: Date;

    @UpdatedAt
    updated_at!: Date;

    ////////////////////////////////////////////////////

    ////////////////////////////////////////////////////
    @BelongsTo(() => dfw_user, { constraints:false })
    user!: dfw_user|null;

}