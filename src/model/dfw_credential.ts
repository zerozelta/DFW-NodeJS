import {Table, Column, Model , DataType, CreatedAt, UpdatedAt, PrimaryKey, ForeignKey, Unique, HasOne, AllowNull, BelongsTo, BelongsToMany, AutoIncrement } from 'sequelize-typescript';
import { isNumber, isString } from 'util';
import dfw_access_credential from './dfw_access_credential';
import dfw_access from './dfw_access';
 
@Table({ tableName: "dfw_credentials"})
export default class dfw_credential extends Model<dfw_credential> {
    
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

    /// Relations
    @BelongsToMany(() => dfw_access, {
        through: {
            model: () => dfw_access_credential,
            unique: false,
        },
        constraints:false
    })
    access!: dfw_access[];

    //// Methods ////

    async checkAccess(access:string|string[]|number|number[]|dfw_access|dfw_access[]){

        if(Array.isArray(access)){
            for(var i = 0;i < access.length; i++){
                if ( await this.checkAccess(access[i]) === true) return true;
            }
        }else{
            var ownAccess:dfw_access[]|null = this.access?this.access:await this.$get("access");

            if(!ownAccess) return false;

            for ( var i = 0; i < ownAccess.length; i++ ){
                var sample = ownAccess[i];

                if(isNumber(access)){
                    if(sample.id === access) return true;
                }else if(isString(access)){
                    if(sample.name === access) return true;
                }else if( access instanceof dfw_credential ){
                    if(sample.id === access.id) return true;
                }
            }
        }
        return false;
    }

    /**
     * TODO Crear funcion para asignar accesos
     */

}