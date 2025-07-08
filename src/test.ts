import { Handler } from "express";
import {
    DFWCore,
    DFWService,
    DFWSessionModule,
    DFWUserModule,
    GETListener,
} from ".";

export class DFWSessionService extends DFWService {
    readonly namespace = 'session' as const;

    test(userDto: any) {
        return this.db.$transaction(async (db) => {
            const { createUserAsync } = new DFWUserModule(db)

            return { "pasa": userDto }
        })
    }
}

var DFW = new DFWCore({
    server: {
        port: 300,
        trustProxy: true
    }
}).start()

const SessionGuard: Handler = async ({ dfw }, { error }, next) => {
    console.log("SessionGuard")
    if (!dfw.getSession().isAuthenticated) {
        console.log("SessionGuard: UNAUTHORIZED")
        next({ data: "UNAUTHORIZED" });
    }
    console.log("passed")
    next()
}

DFW.register({
    test: [
        GETListener({
            services: [DFWSessionService],
            middleware: [SessionGuard]
        },
            async ({ session }) => {
                return session.test({ tom: 'clancy' })
            }
        ),


        {
            method: 'post',
            services: [DFWSessionService],
            listener: async ({ db }, { body }) => {

            }
        }
    ],

    boot: [
        GETListener(async ({ getSession }) => {
            const { user, isAuthenticated } = getSession()
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


/*

DFW.register({
    api: {
        test: [
            GETListener({
                services: [ DFWSessionModule ],
            },
                async ({ db, session }, { body }) => {
                    session.updateSessionAgentAsync(db)

                    return { 'hola': 'mundo' }
                }
            ),

            POSTListener(async (req, res) => {
                const SessionControl = new DFWSessionModule()
                await SessionControl.updateSessionAgentAsync(req)

                return {
                    isAuthenticated: req.isAuthenticated(),
                    session: req.session,
                    user: req.user
                }
            })
        ],
        boot: GETListener(async ({ dfw }) => {
            return { user: dfw.user, isAuth: dfw.isAuthenticated() }
        }),
        bootstrap: [
            POSTListener(async ({ dfw, user, body }, res) => {
                return dfw.db.$transaction(async (db) => {
                    const SecurityControl = new DFWSecurityModule().use(db)
                    const UserControl = new DFWUserModule().use(db)

                    const conty = await UserControl.createUserAsync({
                        name: 'conty',
                        password: 'test'
                    })

                    const adminCred = await SecurityControl.createCredentiaAsync("ADMIN")
                    const devCred = await SecurityControl.createCredentiaAsync("DEVELOPER")

                    const keyAcc = await SecurityControl.createAccessAsync("SMALL_KEY")

                    await SecurityControl.attachAccessToCredentialAsync(keyAcc, adminCred)
                    await SecurityControl.attachUserToCredentialAsync(user?.['id'], adminCred)

                    return { conty, adminCred, devCred, keyAcc }
                })
            })
        ],
        error: [
            GETListener(({ dfw }, res) => {
                res.error({ paraMuestra: "error" }, 510)
                console.log("Esto no se deberia ejecutar")
            })
        ],
        raw: RawListener('get', (req, res, next) => {

        }),
        callback: GETListener({
            callback: async ({ dfw }) => {
                await DFWUtils.sleepAsync(2000).then(() => {
                    console.log("Pasando!!2", dfw.isAuthenticated())
                })
            }
        }, async ({ dfw }) => {
            dfw.addCallback(async () => {
                await DFWUtils.sleepAsync(2000).then(() => {
                    console.log("Pasando!!1", dfw.isAuthenticated())
                })
                console.log("pasando!!1despues")
            })
            return { response: true }
        }),
        login: GETListener(async ({ dfw }, res) => {
            const user = await dfw.db.dfw_user.findFirst()
            if (!user) throw "UNABLE_TO_FIND_USER"

            await dfw.session.login(user)
            console.log(dfw.user)
            return { user: dfw.user, isAuth: dfw.isAuthenticated() }
        }),
        logout: GETListener(async (req, res) => {
            const SessionControl = new DFWSessionModule()
            await SessionControl.logoutAsync(req)
            //req.session = null as any
            return {
                isAuthenticated: req.isAuthenticated(),
                session: req.session,
                user: req.user
            }
        }),
        signup: POSTListener(async ({ dfw }) => {
            const UserControl = new DFWUserModule()
            return UserControl.createUserAsync({
                name: 'zerozelta',
                password: 'test'
            }).catch(() => { throw "UNABLE_TO_CREATE" })
        }),
        upload: POSTListener({
            upload: {
                useTempFiles: true,
                tempFileDir: DFW.tmpDir
            }
        }, async ({ dfw, files }) => {
            const { file } = files as { [key: string]: UploadedFile }
            const DFWFileControl = new DFWFileModule()

            await DFWFileControl.saveUploadedFileAsync(file, {
                makeUrl: (filePath) => `/api/files/${filePath}`
            })

            return files
        }),
        files: StaticPathListener(DFWCore.DFW_UPLOAD_DIR),
        secured: [
            POSTListener(() => {
                return { access: true }
            })
        ]
    }
})

// Path protegido
DFW.addAccessValidator('/api/secured', async ({ dfw: { isAuthenticated, user } }) => {
    if (!isAuthenticated()) return false

    const SecurityControl = new DFWSecurityModule()
    return SecurityControl.userHasCredentialAsync(user!.id, "ADMINO")
})
*/