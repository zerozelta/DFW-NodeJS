import DFWInstance from "../script/DFWInstance";
import DFWAPIListenerConfig from "./DFWAPIListenerConfig";

declare global {
    namespace DFW {
        export interface Boot{
            session:{
                isLogged:boolean,
                nick?:string,
                email?:string,
                credentials:{
                    id:number,
                    name:string,
                }[],
                access?:{
                    id:number,
                    name:string,
                }[]
            }
        }
    }
}