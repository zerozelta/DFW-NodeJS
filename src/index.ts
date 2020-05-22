import DFWInstance from "./script/DFWInstance";
import DFWConfig from "./types/DFWConfig";
import {Express} from "express";

export default class DFWCore{


    public static createInstance(name:string,config:DFWConfig,server?:Express):DFWInstance{
        return new DFWInstance(config,server);
    }
}