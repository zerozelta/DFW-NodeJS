import DFWInstance from "./script/DFWInstance";
import { AddressInfo } from "net";
import DatabaseManager from "./module/DatabaseManager";
import SecurityManager from "./module/SecurityManager";
import APIManager, { APIResponseScheme } from "./module/APIManager";
import { Request, Response } from "express";

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

dfw.getModule(APIManager).addListener("/boot",async (req:Request,res:Response,api:APIResponseScheme)=>{
   return api.success(await api.bootAsync());
});

dfw.getModule(APIManager).addListener("/login",async (req:Request,res:Response,api:APIResponseScheme)=>{
    return api.success({
        status: await api.loginAsync("aldodelacomarca@gmail.com","aldodelacomarca"),
        boot: await api.bootAsync()
    })
});



let listener = dfw.server.listen(3000,()=>{
    console.log("[DFW] Express server running on port " + (listener.address() as AddressInfo).port);
});

