import {Table, Column, Model, ForeignKey, DataType } from 'sequelize-typescript';
import dfw_credential from './dfw_credential';
import dfw_access from './dfw_access';
 
@Table({
    tableName: "dfw_access_credentials",
    indexes: [{
        unique: true,
        fields: ['idAccess', 'idCredential'],
    }],
    timestamps: false
})
export default class dfw_access_credential extends Model {
    
    @ForeignKey(() => dfw_access)
    @Column({ unique: false, type: DataType.INTEGER.UNSIGNED })
    idAccess!: number;

    @ForeignKey(() => dfw_credential)
    @Column({ unique: false, type: DataType.INTEGER.UNSIGNED })
    idCredential!: number;
}