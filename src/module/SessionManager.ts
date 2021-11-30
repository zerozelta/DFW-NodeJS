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

    public static readonly DEFAULT_SESSION_EXPIRE_DAYS = 3;
    public static readonly  DEFAULT_SESSION_PERSIST_EXPIRE_DAYS = 30;

    public SESSION_EXPIRE_DAYS = SessionManager.DEFAULT_SESSION_EXPIRE_DAYS;
    public SESSION_PERSIST_EXPIRE_DAYS = SessionManager.DEFAULT_SESSION_PERSIST_EXPIRE_DAYS;

    constructor(DFW:DFWInstance){
        super(DFW);

        if(DFW.config.session && DFW.config.session.daysToExpire) this.SESSION_EXPIRE_DAYS = DFW.config.session.daysToExpire;
        if(DFW.config.session && DFW.config.session.daysToExpireOnPersistent) this.SESSION_PERSIST_EXPIRE_DAYS = DFW.config.session.daysToExpireOnPersistent;

        setInterval(()=>{ // Clear expired sessions every 6 hours
            this.sweepSessionsAsync();
        },1000*60*60*6);
    }

    public readonly middleware = MiddlewareAsyncWrapper( async (req:Request, res:Response, next:NextFunction)=>{
       
        req.dfw.session = {
            isLogged:false,
            token:undefined as any,
            id:undefined as any,
            record:undefined as any,
            loginAsync : async (username:string,password:string,keepOpen?:boolean)=>{
                return this.loginAsync(req,res,username,password,keepOpen);
            },
            logoutAsync : async ()=>{
                return this.logoutAsync(req,res);
            }
        }

        if(!req.cookies || !req.cookies.sid || !req.cookies.stk){
            req.dfw.session.record = await this.regenerateSessionAsync(req,res);
        }else{    
            let session:dfw_session|null = await dfw_session.findOne({
                where : { id: req.cookies.sid , token: req.cookies.stk },
                include : [{ 
                    association:"user",
                    attributes:["id","nick","email"]
                }]
            }) // Current session

            req.dfw.session.record = session ?? await this.regenerateSessionAsync(req,res);
        }
        
        // setup local vars of session data
        this.setupSessionData(req);
    
        if(req.dfw.session.record.ip != req.ip){ // if ip change then change the database record
            req.dfw.session.record.ip = req.ip;
            await req.dfw.session.record.save();
        }
    
        this.setSessionCookies(req,res);

        next();
    });

    /**
     * 
     * @param req 
     */
    private setupSessionData(req:Request){
        req.dfw.session.id = req.dfw.session.record.id;
        req.dfw.session.token = req.dfw.session.record.token;

        req.dfw.session.isLogged = typeof req.dfw.session.record.user != "undefined" && typeof req.dfw.session.record.idUser == "number";
        
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
            token,
            agent:req.headers['user-agent'] ?? "",
            ip:req.ip,
            expire : moment().add(this.SESSION_EXPIRE_DAYS,"days").toDate()
        });

        req.dfw.session = { id : session.id , token , isLogged: false , record : session } as any

        return session;
    }
    
    /**
     * 
     * @param user 
     * @param password 
     * @param persist undefined => onli browser session time | number => number in days that sessiopn keeps opened
     */
    public async loginAsync(req:Request,res:Response,user:string,password:string,persist:boolean = false):Promise<boolean>{
        if(!user || !password) return false;
        if(this.instance.config.session && this.instance.config.session.forcePersistent) persist = true; // set persistent if is forced

        // Retrive user with credentials
        let userObj =  await this.getUser(user);

        if(userObj){
            if(userObj.checkPassword(password) === true){
                req.dfw.session.record.user = userObj;
                req.dfw.session.record.idUser = userObj.id;
                req.dfw.session.record.persist = persist;
                req.dfw.session.record.expire = moment().add(persist ? this.SESSION_PERSIST_EXPIRE_DAYS : this.SESSION_EXPIRE_DAYS ,"days").toDate();
                req.dfw.session.record = await req.dfw.session.record.save();

                this.setupSessionData(req);

                if(persist){
                    let cookieOptions = this.instance.config.session ? this.instance.config.session.cookieOptions ?? {} : {};
                    cookieOptions.expires = moment().add(this.SESSION_PERSIST_EXPIRE_DAYS,"days").toDate();
                    res.cookie("sid", req.dfw.session.id,cookieOptions);
                    res.cookie("stk", req.dfw.session.token,cookieOptions);
                }
                
                return true;
            }
        }

        await DFWUtils.sleepAsync(2500); // if login attempt fail ocurs a time gap for security to reduce brute force attacks risk
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
            req.dfw.session.record.persist = false;
            req.dfw.session.isLogged = false;
                        
            await req.dfw.session.record.save();

            return true;
        }

        return false;
    }

    /**
     * reset cookies if is needed
     * @param req 
     * @param res 
     */
    public setSessionCookies(req:Request,res:Response){
        let cookieOptions = this.instance.config.session ? this.instance.config.session.cookieOptions ?? {} : {};
        let persist = req.dfw.session.record.persist || (this.instance.config.session && this.instance.config.session.forcePersistent );
        let diffCookies = req.cookies.sid != req.dfw.session.id || req.cookies.stk != req.dfw.session.token;

        if(!diffCookies) return; // not cookie dif Previene setear cookies repetidas en cada peticion 

        if(persist) cookieOptions.expires = moment().add(this.SESSION_PERSIST_EXPIRE_DAYS,"days").toDate();

        res.cookie("sid", req.dfw.session.id,cookieOptions);
        res.cookie("stk", req.dfw.session.token,cookieOptions); 

        req.cookies.sid = req.dfw.session.id;
        req.cookies.stk = req.dfw.session.id;
    }

    /**
     * Destroy all sessions that expires 1 day ago
     */
    public async sweepSessionsAsync(){
        await dfw_session.destroy({
            where:{
                expire: { [Op.lt] : moment().subtract(1,"day").toDate() },
            }
        })
    }

    public async getUser(reference,include?:Includeable[]){
        if(DFWUtils.isEmail(reference)){
            return await dfw_user.findOne({where: { email: reference } , include });
        }else{
            return await dfw_user.findOne({where: { nick: reference } , include });
        }
    }
}