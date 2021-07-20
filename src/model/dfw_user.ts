import { Table, Column, Model , CreatedAt, Default , UpdatedAt, PrimaryKey, Unique, HasMany, BelongsToMany, Length, DataType, AllowNull, AutoIncrement } from 'sequelize-typescript';
import dfw_session from './dfw_session';
import dfw_credential from './dfw_credential';
import dfw_users_credential from './dfw_users_credential';
import dfw_access from './dfw_access';
import { Transaction } from 'sequelize/types';
import SecurityManager from '../module/SecurityManager';

@Table({tableName: 'dfw_users'})
export default class dfw_user extends Model {
    
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER.UNSIGNED)
    id!: number;
    
    @Unique
    @AllowNull(false)
    @Column(DataType.STRING(60))
    nick!: string;

    @Unique
    @AllowNull(false)
    @Length({ max: 60 })
    @Column(DataType.STRING(60))
    email!: string;

    @Default(null)
    @Column(DataType.TINYINT.UNSIGNED)
    status!: string;

    @Column
    @AllowNull(true)
    @Column(DataType.STRING)
    encodedKey!: string;

    @CreatedAt
    created_at!: Date;

    @UpdatedAt
    updated_at!: Date;

    /// Relations

    /// Relations
    @HasMany(() => dfw_session,{ constraints:false })
    sessionsOwned!: dfw_session[];

    @BelongsToMany(() => dfw_credential, {
        through: {
            model: () => dfw_users_credential,
            unique: false,
        },
        constraints:false
    })
    credentials!: dfw_credential[];

    //// methods ////

    /**
     * 
     * @param password plain password to check
     * @returns Boolean true or false if the password match with the encripted password
     */
    checkPassword(password:string):boolean{
        return SecurityManager.verifyPassword(this.encodedKey,password);
    }

    /**
     * 
     * @param access 
     */
    async checkAccessAsync(access:string|string[]|number|number[]|dfw_access|dfw_access[]):Promise<boolean>{

        var ownCreds:dfw_credential[]|null = this.credentials?this.credentials:await this.$get("credentials",{include:[ dfw_access ]});

        if(!ownCreds) return false;

        for(var i = 0; i < ownCreds.length; i++){
            if( await ownCreds[i].checkAccess(access) === true) return true
        }
    
        return false;
    }

    async checkCredentialAsync(credential:string|string[]|number|number[]|dfw_credential|dfw_credential[]):Promise<boolean>{
        if(Array.isArray(credential)){
            for(var i = 0; i < credential.length; i++){
                if( await this.checkCredentialAsync(credential[i]) === true){
                    return true;
                }
            }
        }else{
            var ownCreds:dfw_credential[]|null = this.credentials?this.credentials:await this.$get("credentials",{include:[ dfw_access ]});

            if(!ownCreds) return false;

            for(var i = 0; i < ownCreds.length; i++){
                var sample = ownCreds[i];

                if(typeof credential == "number"){
                    if(sample.id === credential) return true;
                }else if(typeof credential == "string"){
                    if(sample.name === credential) return true;
                }else if( typeof credential == "object" && credential.id ){
                    if(sample.id === credential.id) return true;
                }
            }
        }

        return false;
    }

    async assignCredentialAsync(credential:string|string[]|number|number[]|dfw_credential|dfw_credential[],transaction?:Transaction):Promise<any>{
        if(Array.isArray(credential)){
            if(transaction === undefined) transaction = await this.sequelize.transaction();

            return Promise.all((credential as Array<any>).map((cred)=>{
                return this.assignCredentialAsync(cred,transaction);
            }));
        }else{
            if(typeof credential == "number"){
                return this.$add("credentials",credential,{transaction});
            }else if(typeof credential =="string"){
                var credObj = await dfw_credential.findOne({where:{name:credential}});
                if(credObj){
                    return this.$add("credentials",credObj,{transaction});
                } else{
                    return new Promise((resolve, reject) => {
                        reject("unknown credential " + credential);
                    });
                }
            }else if( credential instanceof dfw_credential ){
                return this.$add("credentials",credential,{transaction});
            }
        }

        return new Promise((resolve, reject) => {
           reject("unknown argument type")
        });
    }

    async removeCredentialAsync(credential:string|string[]|number|number[]|dfw_credential|dfw_credential[],transaction?:Transaction):Promise<any>{
        if(Array.isArray(credential)){
            if(transaction === undefined) transaction = await this.sequelize.transaction();

            return Promise.all((credential as Array<any>).map((cred)=>{
                return this.removeCredentialAsync(cred,transaction);
            }));
        }else{
            if(typeof credential == "number"){
                return this.$remove("credentials",credential,{transaction});
            }else if(typeof credential == "string"){
                var credObj = await dfw_credential.findOne({where:{name:credential}});
                if(credObj){
                    return this.$remove("credentials",credObj,{transaction});
                } else{
                    return new Promise((resolve, reject) => {
                        reject("unknown credential " + credential);
                    });
                }
            }else if( typeof credential == "object" && credential.id ){
                return this.$remove("credentials",credential,{transaction});
            }
        }

        return new Promise((resolve, reject) => {
           reject("unknown argument type")
        });
    }
}