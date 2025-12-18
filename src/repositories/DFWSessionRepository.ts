import type { DFWCore } from "#lib/DFWCore";
import type { PrismaClient } from "#prisma/client";
import type { DFWRequest } from "#types/index";
import { DFWRepository } from "#lib/DFWRepository";

export class DFWSessionRepository extends DFWRepository<PrismaClient> {
    constructor(DFW: DFWCore) {
        super(DFW);
    }

    updateSessionAgentAsync = async ({ dfw, sessionID, ip, socket, headers }: DFWRequest<PrismaClient>) => {
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
   
       loginAsync = async (req: DFWRequest, user: { id: string }) => {
           return new Promise<void>((resolve, reject) => {
               req.login(user, (err: any) => {
                   if (err) { reject(err); return; }
                   (req.session as any)['passport'] = { user: user.id }
                   req.user = { id: user.id }
                   resolve(undefined)
               })
           })
       }
   
       logoutAsync = async (req: DFWRequest) => {
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