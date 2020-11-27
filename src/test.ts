import DFWInstance from "./script/DFWInstance";
import DFWCore from "./"
import { AddressInfo } from "net";
import APIManager from "./module/APIManager";
import { Request, Response } from "express";
import dfw_file from "./model/dfw_file";
import dfw_session from "./model/dfw_session";
import SecurityManager from "./module/SecurityManager";

let DFW = DFWCore.createInstance("test",{
    database:{
        username:"root",
        database:"dfw-test",
        password:"",
        dialect:"mysql",
        logging:console.log
    },
});

DFW.getModule(APIManager).addListener("/upload",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{

    let dfwfile = await dfw.upload.flushFileAsync("file",{expiration:null}) as dfw_file;
    let fileChild = await dfw.upload.assignFileChild(dfwfile.localPath,dfwfile);
    
    return { dfwfile , fileChild }
},{ upload:true , method:"POST" });

///DFW.getModule(APIManager).addListener("/")


DFW.getModule(APIManager).addListener("/test",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{
    return {
        accesible: await DFW.getModule(SecurityManager).checkBindingArrayAsync(req,SecurityManager.jsonToBindings({
            credentials:["ADMIN"]
        }))
    }
});

DFW.getModule(APIManager).addListener("/boot",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{
   return dfw.api.success(await dfw.api.getBootAsync());
},{
    middleware:[
        (req,res,next)=>{
            next();
        },(req,res,next)=>{
            next();
        }
    ]
});

DFW.getModule(APIManager).addListener("/login",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{
    return dfw.api.success({
        status: await dfw.session.loginAsync("aldodelacomarca@gmail.com","aldodelacomarca"),
        boot: await dfw.api.getBootAsync()
    })
});

let listener = DFW.server.listen(300,()=>{
    console.log("[DFW] Express server running on port " + (listener.address() as AddressInfo).port);
});

