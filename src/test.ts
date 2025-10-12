
import { DFWCore } from "#lib/DFWCore";
import { DFWService } from "#lib/DFWService";
import { DFWUtils } from "#lib/DFWUtils";
import { GETListener } from "#listeners/GETListener";
import { DFWSessionModule } from "#modules/DFWSessionModule";
import { DFWUserModule } from "#modules/DFWUserModule";
import z from "zod";

export class DFWSessionService extends DFWService {
    readonly namespace = 'session';

    test = (userDto: any) => this.buildMethod((db) => {
        return db.$transaction(async (db) => {
            const { createUserAsync } = new DFWUserModule(db)
            console.log(createUserAsync)
            return createUserAsync(userDto)
        })
    })

    transaction = (userDto: any) => this.buildTransaction(async (db) => {
        const { createUserAsync } = new DFWUserModule(db)
        return createUserAsync(userDto)
    })

}

const SessionGuard = DFWUtils.makeGuard(async ({ getSession }) => {
    if (getSession().isAuthenticated !== true) throw `ACCESS_DENIED`
})

var DFW = new DFWCore({
    server: {
        port: 300,
        trustProxy: true
    }
}).start()

export const emailSchema = z.object({
    email: z.string()
        .trim()           // opcional: elimina espacios en blanco al inicio y al final
        .toLowerCase()    // opcional: convierte a minúsculas
        .email()          // valida que sea un email válido
});

DFW.register({
    test: [
        GETListener({
            middleware: [SessionGuard],
            services: [DFWSessionService],
        }, async ({ session }) => session.test({ tom: 'clancy' })),

        {
            method: 'post',
            services: [DFWSessionService],
            validate: { body: emailSchema },
            fn: async ({ db }, { body }) => {
                return body.email
            }
        }
    ],

    boot: [
        GETListener(async ({ getSession, db }) => {
            let { user, isAuthenticated } = getSession()
            if (isAuthenticated) {
                user = await db.dfw_user.findUnique({ where: { id: user?.id } }) as any
            }
            return { user, isAuthenticated }
        })
    ],

    login: GETListener(async ({ db, getSession }, req) => {
        const { loginAsync } = new DFWSessionModule(db)

        const user = await db.dfw_user.findFirst()

        if (!user) throw "UNABLE_TO_FIND_USER"

        await loginAsync(req, user)
        return { ...getSession() }
    }),

    logout: GETListener(async ({ db, getSession }, req) => {
        const { logoutAsync } = new DFWSessionModule(db)

        await logoutAsync(req)
        return { ...getSession() }
    }),
})
