import { DFWRequest } from "../types/DFWRequest";
import DFWModule from "../lib/DFWModule";

class DFWSessionModule extends DFWModule {

    async updateSessionAgentAsync({ dfw, sessionID, ip, socket, headers }: DFWRequest) {
        if (sessionID) {
            return dfw.db.dfw_session.updateMany({
                data: {
                    ip: ip ?? socket?.remoteAddress,
                    agent: headers['user-agent'] ?? null
                },
                where: { id: sessionID }
            }).catch((e) => {
                console.log(e)
            })
        }
    }

    async loginAsync(req: DFWRequest, user: { id: string }) {
        return new Promise<void>((resolve, reject) => {
            req.login(user, (err) => {
                if (err) return reject(err)
                req.session['passport'] = { user: user.id }
                req.user = { id: user.id }
                resolve()
            })
        })
    }

    async logoutAsync(req: DFWRequest) {
        return new Promise<void>((resolve) => {
            req.logout((err) => {
                req.session.destroy((err) => {
                    if (process.env.NODE_ENV === 'development') console.log('session destroyed', err)
                    resolve()
                })
            })
        })
    }
}

export default DFWSessionModule