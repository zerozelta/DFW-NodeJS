import DFWInstance from "./script/DFWInstance";
import DFWCore from "./"
import { AddressInfo } from "net";
import APIManager, { APIResponseScheme } from "./module/APIManager";
import { Request, Response } from "express";
import dfw_user from "./model/dfw_user";
import dfw_file from "./model/dfw_file";
import UploadManager from "./module/UploadManager";

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
    await DFW.getModule(UploadManager).removeFileAsync(await dfw_file.findByPk(33));
});

DFW.getModule(APIManager).addListener("/boot",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{
   return dfw.api.success(await dfw.api.getBootAsync());
},{
    security:{
        session:false
    },
    middleware:[
        (req,res,next)=>{
            console.log("hola");
            next();
        },(req,res,next)=>{
            console.log("mundo");
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

