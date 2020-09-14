import DFWInstance from "./script/DFWInstance";
import DFWCore from "./"
import { AddressInfo } from "net";
import APIManager from "./module/APIManager";
import { Request, Response } from "express";
import dfw_file from "./model/dfw_file";
import dfw_session from "./model/dfw_session";

let DFW = DFWCore.createInstance("test",{
    database:{
        username:"root",
        database:"dfw-test",
        password:"",
        dialect:"mysql",
        logging:console.log
    },
    upload:{
        tempDir:".dfw/temp/",
    }
});

DFW.getModule(APIManager).addListener("/upload",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{

    let dfwfile = await dfw.upload.flushFileAsync("file",{expiration:null}) as dfw_file;
    let fileChild = await dfw.upload.assignFileChild(dfwfile.localPath,dfwfile);

    return { dfwfile , fileChild }
},{ upload:true , method:"POST" });


DFW.getModule(APIManager).addListener("/test",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{

    let test =  await dfw.db.transaction(async (transaction)=>{

        await dfw_session.create({
            token:"12h3uh13g123h78123h",
            agent:"tester",
            ip:"::1",
            site:"/",
            expire: new Date(),
        })

        return await dfw_session.create({
            token:"12tokeenenei85uh",
            agent:"tester",
            ip:"::2",
            site:"/",
            expire: new Date(),
        })
    })

    return dfw.api.success({test});

    if(await dfw.security.hasCredentialsAsync("ADMIN")){
        return { correcto : "1" }
    }else{
        return { incorrecto : "0" }
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

