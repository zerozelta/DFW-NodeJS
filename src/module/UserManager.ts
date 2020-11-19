import { NextFunction , Request , Response} from "express";
import DFWInstance from "../script/DFWInstance";
import DFWModule  from "../script/DFWModule";
import dfw_user from "../model/dfw_user";
import dfw_credential from "../model/dfw_credential";
import dfw_access from "../model/dfw_access";
import { Transaction } from "sequelize/types";
import SecurityManager from "./SecurityManager";
import DFWUtils from "../script/DFWUtils";

export default class UserManager implements DFWModule{

    private instance:DFWInstance;
    
    constructor(DFW:DFWInstance){
        this.instance = DFW;
    }

    public middleware = (req:Request,res:Response,next:NextFunction)=>{
        next();
    }

    public async createUserAsync (email:string,nick:string,password:string,transaction?:Transaction):Promise<dfw_user>{
        return this.instance.database.models.dfw_user.create({
            nick,
            email,
            encodedKey:SecurityManager.encryptPassword(password)
        },{ transaction });
    }

    public async findUserAsync(nameOrMail:string,transaction?:Transaction):Promise<dfw_user>{
        if(DFWUtils.isEmail(nameOrMail)){
            return this.instance.database.models.dfw_user.findOne({where: { email: nameOrMail } , transaction });
        }else{
            return this.instance.database.models.dfw_user.findOne({where: { nick: nameOrMail } });
        }
    }

    public async createCredentiaASync(name:string,description?:string,transaction?:Transaction):Promise<dfw_credential>{
        return this.instance.database.models.dfw_credential.create({ name , description },{transaction});
    }

    public async createAccessAsync(name:string,description?:string,transaction?:Transaction):Promise<dfw_access>{
        return this.instance.database.models.dfw_access.create({ name , description },{transaction});
    }

    public async assingCredentialTo(credential:number|dfw_credential|string|string[],user:number|dfw_user,transaction?:Transaction):Promise<boolean>{
        if(user instanceof dfw_user){
            return user.assignCredentialAsync(credential,transaction);
        }else{
            let userObj = await this.instance.database.models.dfw_user.findByPk(user);
            return this.assingCredentialTo(credential,userObj,transaction)
        }
    }

    public async assingAccessTo(access:number|dfw_access,credential:number|dfw_credential,transaction?:Transaction):Promise<boolean>{
        //TODO
        throw `Function APIMager assingAccessTo not implemented yet`
    }
}