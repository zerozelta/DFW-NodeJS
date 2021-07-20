import {Table, Column, Model , ForeignKey, DataType, } from 'sequelize-typescript';
import dfw_user from './dfw_user';
import dfw_credential from './dfw_credential';
 
@Table({
    tableName: "dfw_users_credentials",
    indexes: [{
        unique: true,
        fields: ['idUser', 'idCredential'],
    }],
    timestamps: false
})
export default class dfw_users_credential extends Model {
    
    @ForeignKey(() => dfw_user)
    @Column({ unique: false, type: DataType.INTEGER.UNSIGNED })
    idUser!: number;

    @ForeignKey(() => dfw_credential)
    @Column({ unique: false, type: DataType.INTEGER.UNSIGNED })
    idCredential!: number;
}