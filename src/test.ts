import { DFW } from "./test.dfw";
import { TestGuard } from "./test.guard";
import z from "zod";
import { TestService } from "./test.service";
import { BodyValidationGuard } from "#guards/BodyValidatorGuard";

const validationEmailSchema = z.object({
    email: z.email(),
    test: z.coerce.number().min(5)
})

DFW.register({

    validate: DFW.listener.post({
        middleware: [
            BodyValidationGuard(validationEmailSchema)
        ]
    }, (_, { body }) => {
        return body
    }),

    guard: DFW.listener.get({
        middleware: [
            TestGuard
        ],
    }, () => {
        return 'passed guard test'
    }),

    test: DFW.listener.get(({ db }) => {
        const { getSessions } = new TestService()
        return getSessions()
    })
})

DFW.start()

/*
const SessionGuard = DFWUtils.makeGuard(async ({ getSession }) => {
    if (getSession().isAuthenticated !== true) throw `ACCESS_DENIED`
})

const SessionService = DFW.makeService('session', ({ user }) =>
({
    getSessionInfo: (test: string) =>
        DFW.makeTransaction(async (db) => {
            const { getSessionInfoAsync } = new SessionRepository()
            console.log(test, user)
            return getSessionInfoAsync()
        }),

    getSessionsForUser: () => {

    }
}))


export class DFWSessionService {
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
*/