import { NextFunction, Request , Response } from "express";
import uuidv4 from "uuid/v4";
import moment from "moment";
import dfw_session from "../model/dfw_session";
import DFWInstance from "../script/DFWInstance";
import dfw_user from "../model/dfw_user";
import DFWUtils from "../script/DFWUtils";
import { Includeable, Op } from "sequelize";
import DFWModule, { MiddlewareAsyncWrapper } from "../script/DFWModule";


export default class SessionManager extends DFWModule{

    constructor(DFW:DFWInstance){
        super(DFW);

        setInterval(()=>{ // Clear expired sessions each 6 hours
            this.sweepSessionsAsync();
        },1000*60*60*6);
    }

    public readonly middleware = MiddlewareAsyncWrapper( async (req:Request, res:Response, next:NextFunction)=>{
        
        req.dfw.session = {
            isLogged:false,
            token:undefined as any,
            id:undefined as any,
            record:undefined as any,
            loginAsync : async (username:string,password:string,keepopen?:number)=>{
                return this.loginAsync(req,res,username,password,keepopen);
            },
            logoutAsync : async ()=>{
                return this.logoutAsync(req,res);
            }
        }
        
        if(!req.cookies || !req.cookies.sid || !req.cookies.stk){
            req.dfw.session.record = await this.regenerateSessionAsync(req,res);
        }else{
            req.dfw.session.id = req.cookies.sid;
            req.dfw.session.token = req.cookies.stk;
    
            let session:dfw_session|null = await dfw_session.findOne({
                where : { id: req.dfw.session.id as number , token: req.dfw.session.token as string },
                include : [{ 
                    association:"user",
                    attributes:["id","nick","email"]
                    /*include : [{ association:"credentials" , include:[{ association:"access" }] }] */ 
                }]
            }) // Current session
    
            if(!session || session.token !== req.cookies.stk){
                req.dfw.session.record =  await this.regenerateSessionAsync(req,res);
            }else{
                req.dfw.session.record = session;
            }
        }
    
        /// update session data in async way (fast)
        req.dfw.session.record.expire = moment().add(3,"days").toDate(); // Caducidad
        req.dfw.session.record.agent = req.headers['user-agent']?req.headers['user-agent']:"";  // User agent
        req.dfw.session.record.ip = req.ip;
        req.dfw.session.record.site = req.originalUrl;
        req.dfw.session.record.expire = moment().add(3,"days").toDate();
        req.dfw.session.record.save();
    
        this.setupSessionData(req);
        next();
    });

    /**
     * 
     * @param req 
     */
    private setupSessionData(req:Request){
        req.dfw.session.id = req.dfw.session.record.id;
        req.dfw.session.token = req.dfw.session.record.token;

        req.dfw.session.isLogged = req.dfw.session.record.idUser !== 0 && !req.dfw.session.record.idUser === false;
        
        if(req.dfw.session.isLogged === false && !req.dfw.session.record === false){
            req.dfw.session.record.idUser = null;
            req.dfw.session.record.user = null;
        }
    }


    /**
     * 
     * @param req 
     * @param res 
     */
    private async regenerateSessionAsync(req:Request,res:Response):Promise<dfw_session>{
        let token = uuidv4();

        let session:dfw_session = await dfw_session.create({
            token
        });

        //TODO sistema para controlar la duración de las sesiones
        res.cookie("sid",session.id,{ expires: moment().add(30,"days").toDate() }); 
        res.cookie("stk",token, { expires: moment().add(30,"days").toDate() });

        req.dfw.session = { id : session.id , token , isLogged: false , record : session } as any

        return session;
    }
    
    /**
     * 
     * @param user 
     * @param password 
     * @param keepOpen undefined => onli browser session time | number => number in days that sessiopn keeps opened
     */
    public async loginAsync(req:Request,res:Response,user:string,password:string,keepOpen?:number):Promise<boolean>{
        
        if(!user || !password) return false
        
        // Retrive user with credentials
        let userObj =  await this.getUser(user);
        
        if(userObj){
            if(userObj.checkPassword(password) === true){
                req.dfw.session.record.user = userObj;
                req.dfw.session.record.idUser = userObj.id;
                req.dfw.session.record = await req.dfw.session.record.save();

                this.setupSessionData(req);
                return true;
            }
        }

        await DFWUtils.sleepAsync(2500); // Time gap for security (reduce brute force attacks risk)
        return false;
    }

    /**
     * 
     * @param req 
     * @param res 
     */
    public async logoutAsync(req:Request,res:Response){
        if( req.dfw.session.record){
            req.dfw.session.record.idUser = null;
            req.dfw.session.record.user = null;
            req.dfw.session.isLogged = false;

            await req.dfw.session.record.save();
            return true;
        }

        await this.regenerateSessionAsync(req,res);
        return false;
    }

    /**
     * Destroy all sessions that expires 1 day ago
     */
    public async sweepSessionsAsync(){
        dfw_session.destroy({
            where:{
                expire: { [Op.lt] : moment().subtract(1,"day").toDate() },
            }
        })
    }

    public async getUser(reference,include?:Includeable[]):Promise<dfw_user>{
        if(DFWUtils.isEmail(reference)){
            return await dfw_user.findOne({where: { email: reference } , include });
        }else{
            return await dfw_user.findOne({where: { nick: reference } , include });
        }
    }
}