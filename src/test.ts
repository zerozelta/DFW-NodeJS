import DFWInstance from "./script/DFWInstance";
import { AddressInfo } from "net";
import APIManager, { APIResponseScheme } from "./module/APIManager";
import { Request, Response } from "express";
import dfw_user from "./model/dfw_user";

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

dfw.getModule(APIManager).addListener("/test",async (req:Request,res:Response,api)=>{
    let user:dfw_user = await req.dfw.db.getModel("dfw_user").findByPk(1);
    //let user:dfw_user = await req.dfw.models.dfw_user.findByPk(1);

    return { user }
});


dfw.server.use((err,req,res,next)=>{
    console.log("ERRORRRRR" + err);
    console.log(err);
    next(err);
});

dfw.getModule(APIManager).addListener("/boot",async (req:Request,res:Response,api:APIResponseScheme)=>{
   return api.success(await api.bootAsync());
},{
    security:{
        session:false
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

