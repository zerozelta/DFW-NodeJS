import { DFWRequest } from "../types/DFWRequest";
import DFWController from "./DFWController";

class DFWSessionControler extends DFWController {
    async updateSessionAgentAsync({ dfw, sessionID, ip, socket, headers }: DFWRequest) {
        if (sessionID) {
            return dfw.db.dfw_session.updateMany({
                data: {
                    ip: ip || socket?.remoteAddress,
                    agent: headers['user-agent']
                },
                where: { id: sessionID }
            })
        }
    }

    async logoutAsync(req: DFWRequest) {
        return new Promise<void>((resolve) => {
            req.logout((err) => {
                console.log('passport logout', err)
                req.session.destroy((err) => {
                    console.log('session destroyed', err)
                    resolve()
                })
            })
        })
    }
}

export default DFWSessionControler