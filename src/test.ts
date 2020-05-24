import DFWInstance from "./script/DFWInstance";
import { AddressInfo } from "net";
import DatabaseManager from "./module/DatabaseManager";
import SecurityManager from "./module/SecurityManager";
import APIManager, { APIResponseScheme } from "./module/APIManager";
import { Request, Response } from "express";
import DFW from ".";

let dfw = new DFWInstance({
    database:{
        username:"root",
        database:"dfw-test",
        password:"",
        dialect:"mysql",
        logging:()=>{}
    },
    upload:{
        tempDir:".dfw/temp/"
    }
});

dfw.server.get("/test",(req,res)=>{
    res.json({hola:"mundo"}).send().end();
});

dfw.server.use((err,req,res,next)=>{
    console.log("ERRORRRRR");
    next(err);
});

dfw.getModule(APIManager).addListener("/boot",async (req:Request,res:Response,api:APIResponseScheme)=>{
   return api.success(await api.bootAsync());
},{
    security:{
        session:true
    }
});

dfw.getModule(APIManager).addListener("/login",async (req:Request,res:Response,api:APIResponseScheme)=>{
    return api.success({
        status: await api.loginAsync("aldodelacomarca@gmail.com","aldodelacomarca"),
        boot: await api.bootAsync()
    })
});


let listener = dfw.server.listen(300,()=>{
    console.log("[DFW] Express server running on port " + (listener.address() as AddressInfo).port);
});

