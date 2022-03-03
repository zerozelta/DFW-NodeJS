import DFWInstance from "./DFWInstance";
import { DFWConfig } from "./types/DFWConfig";

export class DFWCore {
    public static DFW:DFWInstance;

    private static instances:{[key:string]:DFWInstance} = {}

    public static createInstance(config:DFWConfig,name = "main"){
        let DFW = new DFWInstance(config);

        if(name == "main") this.DFW = DFW;

        this.instances[name] = DFW;

        return DFW;
    }

    public static get(name:string = "main"):DFWInstance|undefined{
        return this.instances[name];
    }

}

export default DFWCore;

