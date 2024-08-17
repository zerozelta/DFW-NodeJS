import DFWCore from ".."
import passport, { use } from "passport"
import { Strategy } from "passport-local"
import DFWUtils from "../DFWUtils"
import DFWUserController from "../controller/DFWUserController"
import DFWPassportStrategy from "./strategies/DFWPassportStrategy"

export default class SessionManager {
    private DFW: DFWCore

    constructor(DFW: DFWCore) {
        this.DFW = DFW
    }
}