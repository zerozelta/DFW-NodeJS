import { Table, Column, Model , CreatedAt, UpdatedAt, PrimaryKey, DataType, AllowNull, AutoIncrement, Unique, ForeignKey, HasMany } from 'sequelize-typescript';
import dfw_user from './dfw_user';
//import DFWInstance from '../scripts/system/DFWInstance';
//import UploadManager, { UploadConfig, UploadOptions } from '../scripts/modules/UploadManager';
import DFW from '..';
 
@Table({tableName: 'dfw_files'})
export default class dfw_file extends Model<dfw_file>{
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER.UNSIGNED)
    id!: number;
    
    @Column(DataType.STRING(300))
    path!: string;

    @Column(DataType.STRING(100))
    partialPath!: string;

    @Column(DataType.STRING(300))
    name!: string;

    @Unique
    @AllowNull(true)
    @Column(DataType.STRING(100))
    slug!: string;

    @Column(DataType.STRING())
    description!: string;

    @Column(DataType.STRING())
    checksum!: string;

    @Column(DataType.STRING())
    mimetype!: string;

    @Column(DataType.INTEGER.UNSIGNED)
    size!: number;

    @AllowNull(true)
    @ForeignKey(() => dfw_file)
    @Column(DataType.INTEGER.UNSIGNED)
    idFileParent!:number;

    @Column(DataType.TINYINT)
    access!: number;

    @AllowNull(true)
    @Column(DataType.DATEONLY())
    expire!: Date|null;

    @AllowNull(true)
    @ForeignKey(() => dfw_user)
    @Column(DataType.INTEGER.UNSIGNED)
    idUser?: number|null;

    @Column(DataType.STRING())
    variant!: string;

    @CreatedAt
    created_at!: Date;

    @UpdatedAt
    updated_at!: Date;

    //////////////////////////////////////////////////////////////////
    @Column({
        type: DataType.VIRTUAL,
        get: function (){
            //return DFWCore.getIstance().modules.uploadManager.getFileLocalPath(this as any);
        }
    })
    localPath!:string;

    @Column({
        type: DataType.VIRTUAL,
        get: function (){
            //return DFWCore.getIstance().modules.uploadManager.getFileURL(this as any);
        }
    })
    url!:string;

    //////////////////////////////////////////////////////////////////

    @HasMany(()=> dfw_file,"idFileParent")
    children!:dfw_file[];     
    
    //////////////////////////////////////////////////////////////////

 
    
}