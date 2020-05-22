import DFWInstance from "../script/DFWInstance";
import DFWAPIListenerConfig from "./DFWAPIListenerConfig";

declare global {
    namespace DFW {
        export interface DFWRequestScheme{
            meta:{
                instance:DFWInstance,
                config?:DFWAPIListenerConfig,
            },
        }
        
        export interface DFWResponseScheme{
        }
    }
}