import {Table, Column, Model , Default , DataType, CreatedAt, UpdatedAt, PrimaryKey, ForeignKey, Unique, HasOne, AllowNull, BelongsTo, AutoIncrement } from 'sequelize-typescript';
import dfw_user from './dfw_user';
 
@Table({ tableName: "dfw_sessions", indexes:[{ fields:["idUser"]}] })
export default class dfw_session extends Model {
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number; 

    @AllowNull(false)
    @Column(DataType.STRING)
    token!: string;

    @Column
    agent!: string; 

    @Column
    ip!: string;

    @Default(false)
    @AllowNull(false)
    @Column(DataType.BOOLEAN)
    persist?: boolean;

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