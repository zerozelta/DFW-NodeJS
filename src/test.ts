import DFWInstance from "./script/DFWInstance";
import { AddressInfo } from "net";
import APIManager, { APIResponseScheme } from "./module/APIManager";
import { Request, Response } from "express";
import dfw_user from "./model/dfw_user";

let DFW = new DFWInstance({
    database:{
        username:"root",
        database:"dfw-test",
        password:"",
        dialect:"mysql",
        logging:()=>{}
    },
    upload:{
        tempDir:".dfw/temp/",
    }
});


DFW.getModule(APIManager).addListener("/upload",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{
    let dfwfile = await dfw.upload.flushFileAsync("file",{expiration:null});
    return { dfwfile }
},{ upload:true , method:"POST" });


DFW.getModule(APIManager).addListener("/test",async (req:Request,res:Response,dfw:DFW.DFWRequestScheme)=>{
    let user:dfw_user = await DFW.getModule(APIManager).createUserAsync("test@scefira.com","test","test").catch((err)=>console.log(err)) as any;

    console.log(user)

    await dfw.session.loginAsync("test","test");

    //let user:dfw_user = await req.dfw.models.dfw_user.findByPk(1);

    return { user , boot: await dfw.api.getBootAsync() }
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

